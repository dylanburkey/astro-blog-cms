/**
 * Component Manager for WYSIWYG Editor
 * Enables granular updates to individual components (images, layouts, galleries)
 * without rebuilding the entire editor content.
 */

export interface ComponentData {
  id: string;
  type: 'image' | 'layout' | 'gallery' | 'figure' | 'quote' | 'comparison' | 'hero';
  props: Record<string, any>;
  element?: HTMLElement;
}

export interface ImageProps {
  src: string;
  alt: string;
  width?: string;
  layout?: 'inline' | 'float-left' | 'float-right' | 'center' | 'figure';
  caption?: string;
}

export interface LayoutProps {
  type: 'image-left' | 'image-right' | 'split-50-50' | 'gallery-2col' | 'gallery-3col' | 'hero-image' | 'quote-image' | 'comparison';
  images: ImageProps[];
  text?: string;
}

class ComponentManager {
  private components: Map<string, ComponentData> = new Map();
  private editor: HTMLElement | null = null;
  private contentInput: HTMLInputElement | null = null;
  private changeListeners: Set<(componentId: string, data: ComponentData) => void> = new Set();

  /**
   * Initialize the component manager with the editor element
   */
  init(editor: HTMLElement, contentInput: HTMLInputElement) {
    this.editor = editor;
    this.contentInput = contentInput;
    this.scanExistingComponents();
    this.setupMutationObserver();
  }

  /**
   * Generate a unique component ID
   */
  private generateId(): string {
    return `cmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Scan editor for existing components and register them
   */
  scanExistingComponents() {
    if (!this.editor) return;

    // Find all components
    const selectors = [
      '.blog-layout',
      '.blog-gallery', 
      '.blog-hero',
      '.blog-quote',
      '.blog-comparison',
      '.blog-figure',
      '.blog-image-wrapper',
      'figure:not(.blog-figure)'
    ];

    selectors.forEach(selector => {
      this.editor!.querySelectorAll(selector).forEach((el) => {
        const element = el as HTMLElement;
        if (!element.dataset.componentId) {
          this.registerElement(element);
        }
      });
    });

    // Also register standalone images
    this.editor.querySelectorAll('img.blog-image, img.editable').forEach((img) => {
      const imgEl = img as HTMLImageElement;
      const parent = imgEl.closest('[data-component-id]');
      if (!parent && !imgEl.dataset.componentId) {
        this.registerImage(imgEl);
      }
    });
  }

  /**
   * Register an element as a component
   */
  registerElement(element: HTMLElement): string {
    const id = this.generateId();
    element.dataset.componentId = id;

    const type = this.detectComponentType(element);
    const props = this.extractProps(element, type);

    const data: ComponentData = {
      id,
      type,
      props,
      element
    };

    this.components.set(id, data);
    return id;
  }

  /**
   * Register an image as a component
   */
  registerImage(img: HTMLImageElement): string {
    const id = this.generateId();
    img.dataset.componentId = id;

    const data: ComponentData = {
      id,
      type: 'image',
      props: {
        src: img.src,
        alt: img.alt,
        width: img.style.width || '100%',
        layout: this.detectImageLayout(img)
      },
      element: img
    };

    this.components.set(id, data);
    return id;
  }

  /**
   * Detect the type of component from element classes
   */
  private detectComponentType(element: HTMLElement): ComponentData['type'] {
    if (element.classList.contains('blog-layout')) {
      return 'layout';
    }
    if (element.classList.contains('blog-gallery')) {
      return 'gallery';
    }
    if (element.classList.contains('blog-hero')) {
      return 'hero';
    }
    if (element.classList.contains('blog-quote')) {
      return 'quote';
    }
    if (element.classList.contains('blog-comparison')) {
      return 'comparison';
    }
    if (element.classList.contains('blog-figure') || element.tagName === 'FIGURE') {
      return 'figure';
    }
    return 'image';
  }

  /**
   * Detect image layout from classes and styles
   */
  private detectImageLayout(img: HTMLImageElement): ImageProps['layout'] {
    if (img.classList.contains('float-left')) return 'float-left';
    if (img.classList.contains('float-right')) return 'float-right';
    if (img.classList.contains('center')) return 'center';
    if (img.closest('figure')) return 'figure';
    return 'inline';
  }

  /**
   * Extract properties from a component element
   */
  private extractProps(element: HTMLElement, type: ComponentData['type']): Record<string, any> {
    const props: Record<string, any> = {};

    switch (type) {
      case 'image': {
        const img = element.tagName === 'IMG' ? element as HTMLImageElement : element.querySelector('img');
        if (img) {
          props.src = img.src;
          props.alt = img.alt;
          props.width = img.style.width;
        }
        break;
      }
      case 'layout': {
        props.layoutType = element.classList.contains('image-left') ? 'image-left' :
                           element.classList.contains('image-right') ? 'image-right' :
                           element.classList.contains('split-50-50') ? 'split-50-50' : 'custom';
        props.images = Array.from(element.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt
        }));
        props.text = element.querySelector('p, div:not(:has(img))')?.innerHTML || '';
        break;
      }
      case 'gallery': {
        props.columns = element.style.gridTemplateColumns?.includes('3') ? 3 : 2;
        props.images = Array.from(element.querySelectorAll('img')).map(img => ({
          src: img.src,
          alt: img.alt
        }));
        break;
      }
      case 'figure': {
        const img = element.querySelector('img');
        const caption = element.querySelector('figcaption');
        if (img) props.src = img.src;
        if (img) props.alt = img.alt;
        if (caption) props.caption = caption.textContent;
        break;
      }
      case 'quote': {
        const img = element.querySelector('img');
        const blockquote = element.querySelector('blockquote');
        const cite = element.querySelector('cite');
        if (img) props.avatarSrc = img.src;
        if (blockquote) props.quote = blockquote.textContent;
        if (cite) props.author = cite.textContent;
        break;
      }
      case 'comparison': {
        const images = element.querySelectorAll('img');
        const captions = element.querySelectorAll('figcaption');
        props.beforeImage = images[0]?.src;
        props.afterImage = images[1]?.src;
        props.beforeLabel = captions[0]?.textContent || 'Before';
        props.afterLabel = captions[1]?.textContent || 'After';
        break;
      }
    }

    return props;
  }

  /**
   * Get a component by ID
   */
  getComponent(id: string): ComponentData | undefined {
    return this.components.get(id);
  }

  /**
   * Get a component by element
   */
  getComponentByElement(element: HTMLElement): ComponentData | undefined {
    const id = element.dataset.componentId;
    if (!id) return undefined;
    return this.components.get(id);
  }

  /**
   * Update a specific component property without rebuilding everything
   */
  updateComponent(id: string, updates: Partial<Record<string, any>>): boolean {
    const component = this.components.get(id);
    if (!component || !component.element) return false;

    // Merge updates into props
    component.props = { ...component.props, ...updates };

    // Apply updates to DOM
    this.applyUpdatesToDOM(component);

    // Sync content input
    this.syncContent();

    // Notify listeners
    this.notifyListeners(id, component);

    return true;
  }

  /**
   * Update a single image's properties
   */
  updateImage(id: string, props: Partial<ImageProps>): boolean {
    const component = this.components.get(id);
    if (!component) return false;

    const img = component.type === 'image' 
      ? component.element as HTMLImageElement
      : component.element?.querySelector('img');

    if (!img) return false;

    if (props.src !== undefined) img.src = props.src;
    if (props.alt !== undefined) img.alt = props.alt;
    if (props.width !== undefined) img.style.width = props.width;
    
    if (props.layout !== undefined) {
      // Remove old layout classes
      img.classList.remove('float-left', 'float-right', 'center', 'inline');
      
      // Apply new layout
      if (props.layout !== 'inline' && props.layout !== 'figure') {
        img.classList.add(props.layout);
      }
      
      // Apply inline styles for layout
      switch (props.layout) {
        case 'float-left':
          img.style.float = 'left';
          img.style.marginRight = '1rem';
          img.style.marginBottom = '0.5rem';
          break;
        case 'float-right':
          img.style.float = 'right';
          img.style.marginLeft = '1rem';
          img.style.marginBottom = '0.5rem';
          break;
        case 'center':
          img.style.float = '';
          img.style.display = 'block';
          img.style.margin = '1rem auto';
          break;
        default:
          img.style.float = '';
          img.style.display = '';
      }
    }

    // Update stored props
    component.props = { ...component.props, ...props };

    // Sync content
    this.syncContent();
    this.notifyListeners(id, component);

    return true;
  }

  /**
   * Apply prop updates to the DOM element
   */
  private applyUpdatesToDOM(component: ComponentData) {
    const element = component.element;
    if (!element) return;

    switch (component.type) {
      case 'figure': {
        const img = element.querySelector('img');
        const figcaption = element.querySelector('figcaption');
        if (img && component.props.src) img.src = component.props.src;
        if (img && component.props.alt) img.alt = component.props.alt;
        if (figcaption && component.props.caption !== undefined) {
          figcaption.textContent = component.props.caption;
        }
        break;
      }
      case 'quote': {
        const img = element.querySelector('img');
        const blockquote = element.querySelector('blockquote');
        const cite = element.querySelector('cite');
        if (img && component.props.avatarSrc) img.src = component.props.avatarSrc;
        if (blockquote && component.props.quote) blockquote.textContent = component.props.quote;
        if (cite && component.props.author) cite.textContent = component.props.author;
        break;
      }
      // Add more type-specific handlers as needed
    }
  }

  /**
   * Remove a component
   */
  removeComponent(id: string): boolean {
    const component = this.components.get(id);
    if (!component || !component.element) return false;

    component.element.remove();
    this.components.delete(id);
    this.syncContent();

    return true;
  }

  /**
   * Setup mutation observer to track DOM changes
   */
  private setupMutationObserver() {
    if (!this.editor) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Handle removed nodes
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.dataset.componentId) {
            this.components.delete(node.dataset.componentId);
          }
        });

        // Handle added nodes
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if it's a component that needs registration
            if (this.isComponentElement(node) && !node.dataset.componentId) {
              this.registerElement(node);
            }
            // Check for images
            if (node.tagName === 'IMG' && !node.dataset.componentId) {
              this.registerImage(node as HTMLImageElement);
            }
          }
        });
      }
    });

    observer.observe(this.editor, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check if an element is a component
   */
  private isComponentElement(element: HTMLElement): boolean {
    return element.classList.contains('blog-layout') ||
           element.classList.contains('blog-gallery') ||
           element.classList.contains('blog-hero') ||
           element.classList.contains('blog-quote') ||
           element.classList.contains('blog-comparison') ||
           element.classList.contains('blog-figure') ||
           element.classList.contains('blog-image-wrapper') ||
           element.tagName === 'FIGURE';
  }

  /**
   * Sync editor content to the hidden input
   */
  private syncContent() {
    if (this.editor && this.contentInput) {
      this.contentInput.value = this.editor.innerHTML;
    }
  }

  /**
   * Add a change listener
   */
  onChange(listener: (componentId: string, data: ComponentData) => void) {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(componentId: string, data: ComponentData) {
    this.changeListeners.forEach(listener => listener(componentId, data));
  }

  /**
   * Get all components of a specific type
   */
  getComponentsByType(type: ComponentData['type']): ComponentData[] {
    return Array.from(this.components.values()).filter(c => c.type === type);
  }

  /**
   * Get all components
   */
  getAllComponents(): ComponentData[] {
    return Array.from(this.components.values());
  }

  /**
   * Create and insert a new image component
   */
  insertImage(src: string, alt: string = '', options: Partial<ImageProps> = {}): string {
    if (!this.editor) return '';

    const id = this.generateId();
    const width = options.width || '100%';
    const layout = options.layout || 'inline';

    const wrapper = document.createElement('div');
    wrapper.className = 'blog-image-wrapper';
    wrapper.dataset.componentId = id;
    wrapper.style.margin = '1rem 0';

    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = `blog-image editable ${layout !== 'inline' ? layout : ''}`;
    img.style.maxWidth = '100%';
    img.style.width = width;
    img.style.height = 'auto';
    img.style.cursor = 'pointer';
    img.style.display = 'block';

    wrapper.appendChild(img);

    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(wrapper);
      range.setStartAfter(wrapper);
      range.collapse(true);
    } else {
      this.editor.appendChild(wrapper);
    }

    // Add paragraph after
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    wrapper.after(p);

    // Register component
    const data: ComponentData = {
      id,
      type: 'image',
      props: { src, alt, width, layout },
      element: wrapper
    };
    this.components.set(id, data);

    this.syncContent();
    return id;
  }

  /**
   * Duplicate a component
   */
  duplicateComponent(id: string): string | null {
    const component = this.components.get(id);
    if (!component || !component.element) return null;

    const clone = component.element.cloneNode(true) as HTMLElement;
    const newId = this.generateId();
    clone.dataset.componentId = newId;

    // Insert after original
    component.element.after(clone);

    // Register new component
    const newData: ComponentData = {
      id: newId,
      type: component.type,
      props: { ...component.props },
      element: clone
    };
    this.components.set(newId, newData);

    this.syncContent();
    return newId;
  }
}

// Export singleton instance
export const componentManager = new ComponentManager();

// Export for use in browser
if (typeof window !== 'undefined') {
  (window as any).componentManager = componentManager;
}
