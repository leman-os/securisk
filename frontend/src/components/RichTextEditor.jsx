import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Code, Quote, Minus, ImageIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';

// Custom Image extension with proportional resize slider
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      // Container
      const container = document.createElement('div');
      container.style.cssText = 'display:inline-block;position:relative;max-width:100%;line-height:0;';

      // Image
      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.style.cssText = 'display:block;max-width:100%;cursor:pointer;border:2px solid transparent;transition:border-color 0.2s;';
      if (node.attrs.width) img.style.width = node.attrs.width + 'px';
      if (node.attrs.height) img.style.height = node.attrs.height + 'px';

      // Resize controls panel
      const controls = document.createElement('div');
      controls.style.cssText = [
        'display:none;',
        'position:absolute;',
        'bottom:8px;',
        'left:50%;',
        'transform:translateX(-50%);',
        'background:rgba(15,23,42,0.85);',
        'border-radius:6px;',
        'padding:4px 8px;',
        'align-items:center;',
        'gap:4px;',
        'z-index:20;',
        'white-space:nowrap;',
        'box-shadow:0 2px 8px rgba(0,0,0,0.4);',
      ].join('');

      // Aspect ratio tracking
      let naturalRatio = null;

      img.addEventListener('load', () => {
        naturalRatio = img.naturalHeight / img.naturalWidth;
      });

      if (img.complete && img.naturalWidth) {
        naturalRatio = img.naturalHeight / img.naturalWidth;
      }

      // Percentage buttons
      [25, 50, 75, 100].forEach(pct => {
        const pctBtn = document.createElement('button');
        pctBtn.textContent = pct + '%';
        pctBtn.style.cssText = [
          'background:rgba(255,255,255,0.15);',
          'color:#e2e8f0;',
          'border:none;',
          'border-radius:6px;',
          'width:48px;',
          'height:48px;',
          'font-size:13px;',
          'font-weight:600;',
          'cursor:pointer;',
          'font-family:monospace;',
          'transition:background 0.15s;',
          'display:flex;',
          'align-items:center;',
          'justify-content:center;',
        ].join('');
        pctBtn.addEventListener('mouseenter', () => {
          pctBtn.style.background = 'rgba(6,182,212,0.5)';
        });
        pctBtn.addEventListener('mouseleave', () => {
          pctBtn.style.background = 'rgba(255,255,255,0.15)';
        });
        pctBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const containerWidth = editor.view.dom.clientWidth - 32;
          const newWidth = Math.round(containerWidth * pct / 100);
          const newHeight = naturalRatio ? Math.round(newWidth * naturalRatio) : null;
          img.style.width = newWidth + 'px';
          if (newHeight) img.style.height = newHeight + 'px';
          const pos = getPos();
          if (typeof pos === 'number') {
            editor.commands.updateAttributes('image', { width: newWidth, height: newHeight });
          }
        });
        controls.appendChild(pctBtn);
      });

      // Toggle controls on image click
      let controlsVisible = false;
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        controlsVisible = !controlsVisible;
        controls.style.display = controlsVisible ? 'flex' : 'none';
        img.style.borderColor = controlsVisible ? '#06b6d4' : 'transparent';
      });

      // Close controls on outside click
      const handleDocClick = () => {
        if (controlsVisible) {
          controlsVisible = false;
          controls.style.display = 'none';
          img.style.borderColor = 'transparent';
        }
      };
      document.addEventListener('click', handleDocClick);

      container.appendChild(img);
      container.appendChild(controls);

      return {
        dom: container,
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false;
          img.src = updatedNode.attrs.src || img.src;
          if (updatedNode.attrs.width) {
            img.style.width = updatedNode.attrs.width + 'px';
            slider.value = updatedNode.attrs.width;
            widthLabel.textContent = updatedNode.attrs.width + 'px';
          }
          if (updatedNode.attrs.height) {
            img.style.height = updatedNode.attrs.height + 'px';
          }
          return true;
        },
        destroy() {
          document.removeEventListener('click', handleDocClick);
        },
      };
    };
  },
});

const MenuBar = ({ editor, onImageUpload }) => {
  const fileInputRef = useRef(null);

  if (!editor) return null;

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Размер изображения не должен превышать 5 МБ');
      return;
    }

    try {
      const imageUrl = await onImageUpload(file);
      if (imageUrl) {
        editor.chain().focus().setImage({ src: imageUrl }).run();
      }
    } catch (error) {
      toast.error('Ошибка загрузки изображения');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const btn = (onClick, title, isActive, children) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent editor blur
        onClick();
      }}
      className={`p-2 rounded hover:bg-slate-200 ${isActive ? 'bg-slate-300' : ''}`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="border-b border-slate-200 p-2 flex flex-wrap gap-1 bg-slate-50">
      {btn(() => editor.chain().focus().toggleBold().run(), 'Жирный', editor.isActive('bold'), <Bold className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'Курсив', editor.isActive('italic'), <Italic className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleCode().run(), 'Код', editor.isActive('code'), <Code className="w-4 h-4" />)}
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'Заголовок 1', editor.isActive('heading', { level: 1 }), <Heading1 className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'Заголовок 2', editor.isActive('heading', { level: 2 }), <Heading2 className="w-4 h-4" />)}
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), 'Маркированный список', editor.isActive('bulletList'), <List className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), 'Нумерованный список', editor.isActive('orderedList'), <ListOrdered className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), 'Цитата', editor.isActive('blockquote'), <Quote className="w-4 h-4" />)}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), 'Горизонтальная линия', false, <Minus className="w-4 h-4" />)}
      <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
        className="p-2 rounded hover:bg-slate-200"
        title="Вставить изображение"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

const RichTextEditor = ({ content, onChange }) => {
  const [isUploading, setIsUploading] = useState(false);

  // Track content that originated from the editor to avoid reset loops
  const editorContentRef = useRef(content);

  const handleImageUpload = async (file) => {
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/wiki/upload-image`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const imageUrl = response.data.url;
      if (imageUrl.startsWith('/api')) {
        const base = API.endsWith('/api') ? API.slice(0, -4) : API.replace(/\/api$/, '');
        return `${base}${imageUrl}`;
      }
      return imageUrl.startsWith('http') ? imageUrl : `${API}${imageUrl}`;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка загрузки изображения');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      ResizableImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'wiki-image' },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      editorContentRef.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none p-4 min-h-[200px] focus:outline-none',
      },
    },
  });

  // Only reset editor content when change comes from outside (e.g. switching pages)
  useEffect(() => {
    if (editor && content !== editorContentRef.current) {
      editorContentRef.current = content;
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <div className="border border-slate-300 rounded-md overflow-hidden">
      <MenuBar editor={editor} onImageUpload={handleImageUpload} />
      {isUploading && (
        <div className="px-4 py-2 bg-blue-50 text-blue-600 text-sm">
          Загрузка изображения...
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
