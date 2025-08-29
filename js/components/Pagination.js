export function createPagination(container, onPageChange, itemsPerPage = 20) {
    const state = {
        container,
        onPageChange,
        currentPage: 1,
        totalItems: 0,
        itemsPerPage
    }

    function getTotalPages() {
        return Math.ceil(state.totalItems / state.itemsPerPage)
    }

    function setData(totalItems, currentPage = 1) {
        state.totalItems = totalItems
        state.currentPage = currentPage
        render()
    }

    function render() {
        const totalPages = getTotalPages()
        if (totalPages <= 1) {
            state.container.innerHTML = ''
            return
        }

        let paginationHTML = ''
        const prevDisabled = state.currentPage === 1 ? 'disabled' : ''
        paginationHTML += `<button class="pagination-btn pagination-prev" data-page="${state.currentPage - 1}" ${prevDisabled}><i class="bi bi-chevron-left"></i></button>`

        let startPage = Math.max(1, state.currentPage - 2)
        let endPage = Math.min(totalPages, state.currentPage + 2)

        if (state.currentPage <= 3) endPage = Math.min(5, totalPages)
        if (state.currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4)

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" data-page="1">1</button>`
            if (startPage > 2) paginationHTML += `<span class="pagination-dots">...</span>`
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === state.currentPage ? 'active' : ''
            paginationHTML += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) paginationHTML += `<span class="pagination-dots">...</span>`
            paginationHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`
        }

        const nextDisabled = state.currentPage === totalPages ? 'disabled' : ''
        paginationHTML += `<button class="pagination-btn pagination-next" data-page="${state.currentPage + 1}" ${nextDisabled}><i class="bi bi-chevron-right"></i></button>`

        state.container.innerHTML = paginationHTML
        addEventListeners()
    }

    function addEventListeners() {
        const buttons = state.container.querySelectorAll('.pagination-btn')
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Зупиняємо пропагацію подій, щоб не спрацьовували інші обробники
                e.preventDefault()
                e.stopPropagation()
                
                if (button.hasAttribute('disabled')) return
                const page = parseInt(button.dataset.page)
                if (page && page !== state.currentPage && page >= 1 && page <= getTotalPages()) {
                    state.currentPage = page
                    render()
                    state.onPageChange?.(page)
                }
            })
        })
    }

    return { setData, getTotalPages, render }
}