const { getIntegrationSdk, isIntegrationSdkConfigured } = require('../../api-util/integrationSdk');

const csvEscape = value => {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const csvRow = values => values.map(csvEscape).join(',') + '\n';

// Fetches every user page by page. Fine for a marketplace this size - not
// meant to scale to a very large user base without pagination on the report
// itself.
const fetchAllUsers = integrationSdk => {
  const fetchPage = (page, acc) =>
    integrationSdk.users.query({ page }).then(response => {
      const users = acc.concat(response.data.data);
      const totalPages = response.data.meta.totalPages;
      return page < totalPages ? fetchPage(page + 1, users) : users;
    });
  return fetchPage(1, []);
};

const userLabel = user => {
  const email = user?.attributes?.email;
  const displayName = user?.attributes?.profile?.displayName;
  return [displayName, email].filter(Boolean).join(' - ') || user?.id?.uuid || '';
};

/**
 * Admin-only referral report, protected by a shared secret token
 * (REFERRAL_ADMIN_REPORT_TOKEN) rather than end-user auth, since this
 * exposes other users' emails. Lists every user that signed up via a
 * referral link, who referred them, and whether/when they converted (first
 * completed booking) - so the operator can manually pay out the EUR 5
 * referral reward via bank transfer. No automatic payout happens anywhere.
 */
module.exports = (req, res) => {
  const expectedToken = process.env.REFERRAL_ADMIN_REPORT_TOKEN;
  const providedToken = req.query?.token;

  if (!expectedToken || providedToken !== expectedToken) {
    res.status(403).send('Forbidden');
    return;
  }

  if (!isIntegrationSdkConfigured()) {
    res
      .status(503)
      .send(
        'SHARETRIBE_INTEGRATION_CLIENT_ID/SECRET not set - see server/api-util/integrationSdk.js'
      );
    return;
  }

  const integrationSdk = getIntegrationSdk();

  fetchAllUsers(integrationSdk)
    .then(users => {
      const usersById = new Map(users.map(u => [u.id.uuid, u]));
      const referrals = users.filter(u => !!u.attributes?.profile?.privateData?.referredByUserId);

      const rows = referrals.map(referredUser => {
        const privateData = referredUser.attributes.profile.privateData;
        const referrer = usersById.get(privateData.referredByUserId);

        return [
          userLabel(referredUser),
          referredUser.attributes.createdAt,
          referrer ? userLabel(referrer) : `Unknown (id: ${privateData.referredByUserId})`,
          privateData.referredByUserId,
          privateData.referralConverted ? 'yes' : 'no',
          privateData.referralConvertedAt || '',
        ];
      });

      const header = [
        'Referred user',
        'Signed up at',
        'Referrer',
        'Referrer user id',
        'Converted (first booking completed)',
        'Converted at',
      ];

      const csv = csvRow(header) + rows.map(csvRow).join('');

      res
        .status(200)
        .set('Content-Type', 'text/csv; charset=utf-8')
        .set('Content-Disposition', 'attachment; filename="omnirent-referrals.csv"')
        .send(csv)
        .end();
    })
    .catch(e => {
      console.error('[referral] Failed to build admin report:', e);
      res.status(500).send('Failed to build referral report.');
    });
};
