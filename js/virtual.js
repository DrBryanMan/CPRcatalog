// virtual-list.js
export class VirtualList {
    constructor(container, items, renderItem, itemHeight) {
        this.container = container;
        this.items = items;
        this.renderItem = renderItem;
        this.itemHeight = itemHeight;

        this.screenItemsCount = Math.ceil(container.clientHeight / itemHeight);
        this.cachedItemsCount = this.screenItemsCount * 3;
        this.lastRenderedItem = 0;

        this.container.style.height = `${items.length * itemHeight}px`;
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';

        this.onScroll = this.onScroll.bind(this);
        this.container.addEventListener('scroll', this.onScroll);

        this.renderItems(0);
    }

    onScroll() {
        const scrollTop = this.container.scrollTop;
        const startIndex = Math.floor(scrollTop / this.itemHeight);

        if (Math.abs(startIndex - this.lastRenderedItem) > this.screenItemsCount) {
            this.renderItems(startIndex);
        }
    }

    renderItems(startIndex) {
        this.container.innerHTML = '';
        const endIndex = Math.min(startIndex + this.cachedItemsCount, this.items.length);

        for (let i = startIndex; i < endIndex; i++) {
            const item = this.items[i];
            const itemElement = this.renderItem(item);
            itemElement.style.position = 'absolute';
            itemElement.style.top = `${i * this.itemHeight}px`;
            itemElement.style.height = `${this.itemHeight}px`;
            this.container.appendChild(itemElement);
        }

        this.lastRenderedItem = startIndex;
    }
}