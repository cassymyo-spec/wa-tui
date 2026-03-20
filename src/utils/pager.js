function paginate(items, page = 1, pageSize = 10) {
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const paginatedItems = items.slice(start, start + pageSize);

    return {
        items: paginatedItems,
        page: safePage,
        totalPages,
        totalItems,
        pageSize
    };
}

module.exports = {
    paginate
};
