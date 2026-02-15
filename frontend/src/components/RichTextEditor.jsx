import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Code, Quote, Minus, ImageIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';

// Custom Image extension with resizable support
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height,
          };
        },
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          if (!attributes.style) {
            return {};
          }
          return {
            style: attributes.style,
          };
        },
      },
    };
  },
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const img = document.createElement('img');
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        img.setAttribute(key, value);
      });
      img.src = node.attrs.src;
      if (node.attrs.width) img.width = node.attrs.width;
      if (node.attrs.height) img.height = node.attrs.height;
      img.style.cursor = 'pointer';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.border = '2px dashed transparent';
      img.style.transition = 'border-color 0.2s';
      
      img.addEventListener('mouseenter', () => {
        img.style.borderColor = '#3b82f6';
      });
      
      img.addEventListener('mouseleave', () => {
        img.style.borderColor = 'transparent';
      });

      // Make image resizable
      img.style.resize = 'both';
      img.style.overflow = 'auto';
      img.style.display = 'block';
      
      img.addEventListener('load', () => {
        if (!node.attrs.width && !node.attrs.height) {
          const updateAttrs = () => {
            const pos = getPos();
            if (typeof pos === 'number') {
              editor.commands.updateAttributes('image', {
                width: img.offsetWidth,
                height: img.offsetHeight,
              });
            }
          };
          
          img.addEventListener('resize', updateAttrs);
          // Also update on manual resize via mouse
          let resizeObserver;
          if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(updateAttrs);
            resizeObserver.observe(img);
          }
        }
      });

      return {
        dom: img,
      };
    };
  },
});

const MenuBar = ({ editor, onImageUpload }) => {
  const fileInputRef = useRef(null);

  if (!editor) {
    return null;
  }

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
      console.error('Image upload error:', error);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="border-b border-slate-200 p-2 flex flex-wrap gap-1 bg-slate-50">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-300' : ''}`}
        title="Жирный"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-300' : ''}`}
        title="Курсив"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('code') ? 'bg-slate-300' : ''}`}
        title="Код"
      >
        <Code className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-300' : ''}`}
        title="Заголовок 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-300' : ''}`}
        title="Заголовок 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bulletList') ? 'bg-slate-300' : ''}`}
        title="Маркированный список"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('orderedList') ? 'bg-slate-300' : ''}`}
        title="Нумерованный список"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('blockquote') ? 'bg-slate-300' : ''}`}
        title="Цитата"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-2 rounded hover:bg-slate-200"
        title="Горизонтальная линия"
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        id="image-upload"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
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

  const handleImageUpload = async (file) => {
    setIsUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/wiki/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      // Return full URL
      const imageUrl = response.data.url;
      // URL comes as /api/wiki/image/{id}, need to construct full URL
      if (imageUrl.startsWith('/api')) {
        // Get base URL from API (which is BACKEND_URL/api)
        const BACKEND_URL = API.replace('/api', '');
        return `${BACKEND_URL}${imageUrl}`;
      }
      return imageUrl.startsWith('http') ? imageUrl : `${API}${imageUrl}`;
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(error.response?.data?.detail || 'Ошибка загрузки изображения');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      ResizableImage.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'wiki-image',
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none p-4 min-h-[200px] focus:outline-none',
      },
    },
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
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
      <style jsx global>{`
        .ProseMirror {
          outline: none;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          display: block;
          resize: both;
          overflow: auto;
          cursor: pointer;
          border: 2px dashed transparent;
          transition: border-color 0.2s;
        }
        .ProseMirror img:hover {
          border-color: #3b82f6;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
