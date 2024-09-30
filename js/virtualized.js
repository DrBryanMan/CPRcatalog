export class VirtualizedList {
    constructor(container, items, renderItem, itemHeight = 100) {
        this.container = container;
        this.items = items;
        this.renderItem = renderItem;
        this.itemHeight = itemHeight;

        this.visibleItems = new Map();
        this.topPadding = 0;
        this.bottomPadding = 0;

        this.containerHeight = 0;
        this.scrollTop = 0;

        this.setupContainer();
        this.render();

        this.container.addEventListener('scroll', () => {
            this.scrollTop = this.container.scrollTop;
            this.render();
        });

        window.addEventListener('resize', () => {
            this.containerHeight = this.container.clientHeight;
            this.render();
        });
    }

    setupContainer() {
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';
        this.containerHeight = this.container.clientHeight;
    }

    render() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            this.items.length - 1,
            Math.floor((this.scrollTop + this.containerHeight) / this.itemHeight)
        );

        const visibleIndexes = new Set();
        for (let i = startIndex; i <= endIndex; i++) {
            visibleIndexes.add(i);
            if (!this.visibleItems.has(i)) {
                const item = this.renderItem(this.items[i]);
                item.style.position = 'absolute';
                item.style.top = `${i * this.itemHeight}px`;
                item.style.height = `${this.itemHeight}px`;
                this.container.appendChild(item);
                this.visibleItems.set(i, item);
            }
        }

        for (const [index, item] of this.visibleItems.entries()) {
            if (!visibleIndexes.has(index)) {
                this.container.removeChild(item);
                this.visibleItems.delete(index);
            }
        }

        this.topPadding = startIndex * this.itemHeight;
        this.bottomPadding = (this.items.length - endIndex - 1) * this.itemHeight;

        this.container.style.paddingTop = `${this.topPadding}px`;
        this.container.style.paddingBottom = `${this.bottomPadding}px`;
        this.container.style.height = `${this.items.length * this.itemHeight}px`;
    }

    updateItems(newItems) {
        this.items = newItems;
        this.visibleItems.clear();
        this.container.innerHTML = '';
        this.render();
    }
}