import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen, Plus, Edit, Trash2, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Wiki = ({ user }) => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedPages, setExpandedPages] = useState({});
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    parent_id: null
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/wiki`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPages(response.data);
    } catch (error) {
      toast.error('Ошибка загрузки страниц');
    } finally {
      setLoading(false);
    }
  };

  const createPage = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/wiki`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Страница создана');
      setIsCreateDialogOpen(false);
      setFormData({ title: '', content: '', parent_id: null });
      fetchPages();
    } catch (error) {
      toast.error('Ошибка создания страницы');
    }
  };

  const updatePage = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/wiki/${selectedPage.id}`, {
        title: formData.title,
        content: formData.content
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Страница обновлена');
      setIsEditMode(false);
      fetchPages();
      // Update selected page
      setSelectedPage({ ...selectedPage, title: formData.title, content: formData.content });
    } catch (error) {
      toast.error('Ошибка обновления страницы');
    }
  };

  const deletePage = async (pageId) => {
    if (!window.confirm('Удалить страницу?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/wiki/${pageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Страница удалена');
      if (selectedPage?.id === pageId) {
        setSelectedPage(null);
      }
      fetchPages();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка удаления страницы');
    }
  };

  const toggleExpand = (pageId) => {
    setExpandedPages(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const buildTree = (pages) => {
    const tree = [];
    const map = {};
    
    pages.forEach(page => {
      map[page.id] = { ...page, children: [] };
    });
    
    pages.forEach(page => {
      if (page.parent_id && map[page.parent_id]) {
        map[page.parent_id].children.push(map[page.id]);
      } else if (!page.parent_id) {
        tree.push(map[page.id]);
      }
    });
    
    return tree;
  };

  const renderTree = (nodes, level = 0) => {
    return nodes.map(node => (
      <div key={node.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-100 ${
            selectedPage?.id === node.id ? 'bg-cyan-50 text-cyan-700' : ''
          }`}
          onClick={() => {
            setSelectedPage(node);
            setIsEditMode(false);
          }}
        >
          {node.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {expandedPages[node.id] ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {node.children.length === 0 && <div className="w-5" />}
          <FileText className="w-4 h-4" />
          <span className="flex-1 text-sm">{node.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deletePage(node.id);
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {expandedPages[node.id] && node.children.length > 0 && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  const tree = buildTree(pages);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">База знаний</h1>
          <p className="text-slate-600">Документация и инструкции</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-cyan-600">
              <Plus className="w-4 h-4 mr-2" />
              Создать страницу
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новая страница</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Введите название страницы"
                />
              </div>
              <div>
                <Label>Содержание</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  modules={modules}
                  className="bg-white"
                />
              </div>
              <Button onClick={createPage} className="w-full">
                Создать
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Tree navigation */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Структура
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {tree.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Нет страниц</p>
              ) : (
                <div className="space-y-1">
                  {renderTree(tree)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="col-span-9">
          {selectedPage ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{isEditMode ? 'Редактирование' : selectedPage.title}</CardTitle>
                <div className="flex gap-2">
                  {isEditMode ? (
                    <>
                      <Button onClick={updatePage} size="sm">Сохранить</Button>
                      <Button onClick={() => {
                        setIsEditMode(false);
                        setFormData({ title: selectedPage.title, content: selectedPage.content, parent_id: selectedPage.parent_id });
                      }} variant="outline" size="sm">
                        Отмена
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => {
                      setIsEditMode(true);
                      setFormData({ title: selectedPage.title, content: selectedPage.content, parent_id: selectedPage.parent_id });
                    }} size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Редактировать
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Название</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Содержание</Label>
                      <ReactQuill
                        theme="snow"
                        value={formData.content}
                        onChange={(content) => setFormData({ ...formData, content })}
                        modules={modules}
                        className="bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedPage.content }}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Выберите страницу из списка или создайте новую</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wiki;
