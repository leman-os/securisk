import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Code, Quote, Minus } from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 p-2 flex flex-wrap gap-1 bg-slate-50">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bold') ? 'bg-slate-300' : ''}`}
        title="Жирный"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('italic') ? 'bg-slate-300' : ''}`}
        title="Курсив"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('code') ? 'bg-slate-300' : ''}`}
        title="Код"
      >
        <Code className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-300' : ''}`}
        title="Заголовок 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-300' : ''}`}
        title="Заголовок 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('bulletList') ? 'bg-slate-300' : ''}`}
        title="Маркированный список"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('orderedList') ? 'bg-slate-300' : ''}`}
        title="Нумерованный список"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-slate-200 ${editor.isActive('blockquote') ? 'bg-slate-300' : ''}`}
        title="Цитата"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-2 rounded hover:bg-slate-200"
        title="Горизонтальная линия"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
};

const RichTextEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-slate-300 rounded-md overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="prose max-w-none p-4 min-h-[200px] focus:outline-none"
      />
    </div>
  );
};

export default RichTextEditor;
