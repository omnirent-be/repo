import { renderHook } from '@testing-library/react';

import { createListing, createImage, createUser } from '../util/testData';
import useAutoLoadMorePresentableResults from './useAutoLoadMorePresentableResults';

const presentableListing = id =>
  createListing(
    id,
    { title: `${id} title` },
    { images: [createImage(`${id}-image`)], author: createUser(`${id}-author`) }
  );

const junkListing = id =>
  createListing(id, { title: 'a a' }, { author: createUser(`${id}-author`) });

describe('useAutoLoadMorePresentableResults', () => {
  it('calls onLoadMore when there are too few presentable listings and more pages exist', () => {
    const onLoadMore = jest.fn();
    renderHook(() =>
      useAutoLoadMorePresentableResults({
        listings: [junkListing('l1'), junkListing('l2')],
        pagination: { page: 1, totalPages: 2 },
        searchInProgress: false,
        loadMoreInProgress: false,
        onLoadMore,
      })
    );
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore once enough presentable listings are loaded', () => {
    const onLoadMore = jest.fn();
    const listings = Array.from({ length: 24 }, (_, i) => presentableListing(`l${i}`));
    renderHook(() =>
      useAutoLoadMorePresentableResults({
        listings,
        pagination: { page: 1, totalPages: 2 },
        searchInProgress: false,
        loadMoreInProgress: false,
        onLoadMore,
      })
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when there are no more pages', () => {
    const onLoadMore = jest.fn();
    renderHook(() =>
      useAutoLoadMorePresentableResults({
        listings: [junkListing('l1')],
        pagination: { page: 2, totalPages: 2 },
        searchInProgress: false,
        loadMoreInProgress: false,
        onLoadMore,
      })
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore while a search or load-more is already in progress', () => {
    const onLoadMore = jest.fn();
    renderHook(() =>
      useAutoLoadMorePresentableResults({
        listings: [junkListing('l1')],
        pagination: { page: 1, totalPages: 2 },
        searchInProgress: true,
        loadMoreInProgress: false,
        onLoadMore,
      })
    );
    renderHook(() =>
      useAutoLoadMorePresentableResults({
        listings: [junkListing('l1')],
        pagination: { page: 1, totalPages: 2 },
        searchInProgress: false,
        loadMoreInProgress: true,
        onLoadMore,
      })
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore when there is no pagination yet', () => {
    const onLoadMore = jest.fn();
    renderHook(() =>
      useAutoLoadMorePresentableResults({
        listings: [],
        pagination: null,
        searchInProgress: false,
        loadMoreInProgress: false,
        onLoadMore,
      })
    );
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not call onLoadMore again for the same page once already requested', () => {
    const onLoadMore = jest.fn();
    const { rerender } = renderHook(
      props => useAutoLoadMorePresentableResults(props),
      {
        initialProps: {
          listings: [junkListing('l1')],
          pagination: { page: 1, totalPages: 2 },
          searchInProgress: false,
          loadMoreInProgress: false,
          onLoadMore,
        },
      }
    );
    rerender({
      listings: [junkListing('l1'), junkListing('l2')],
      pagination: { page: 1, totalPages: 2 },
      searchInProgress: false,
      loadMoreInProgress: false,
      onLoadMore,
    });
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
