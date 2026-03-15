import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from './Toast';

interface Item {
  id: string;
  title: string;
  description: string;
  image_url: string;
  gallery?: string;
  custom_fields?: string;
}

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  onSave: (updatedItem: Item) => void;
}

export default function EditItemModal({ isOpen, onClose, item, onSave }: EditItemModalProps) {
  const [title, setTitle] = useState(item?.title || '');
  const { showToast } = useToast();
  const [description, setDescription] = useState(item?.description || '');
  const [imageUrl, setImageUrl] = useState(item?.image_url || '');
  const [gallery, setGallery] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  React.useEffect(() => {
    if (item) {
      setTitle(item.title || '');
      setDescription(item.description || '');
      setImageUrl(item.image_url || '');
      try {
        const parsedGallery = item.gallery ? JSON.parse(item.gallery) : [];
        setGallery(Array.isArray(parsedGallery) ? parsedGallery : []);
      } catch (e) {
        setGallery([]);
      }
      try {
        const parsedFields = item.custom_fields ? JSON.parse(item.custom_fields) : [];
        setCustomFields(Array.isArray(parsedFields) ? parsedFields : []);
      } catch (e) {
        setCustomFields([]);
      }
    } else {
      setTitle('');
      setDescription('');
      setImageUrl('');
      setGallery([]);
      setCustomFields([]);
    }
  }, [item]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!item || !title.trim() || !description.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          image_url: imageUrl,
          gallery: JSON.stringify(gallery),
          custom_fields: JSON.stringify(customFields.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}))
        })
      });

      if (res.ok) {
        const updatedItem = await res.json();
        onSave(updatedItem);
        onClose();
      } else {
        showToast('Failed to update item', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const updateCustomField = (index: number, key: string, value: string) => {
    const updated = [...customFields];
    updated[index] = { key, value };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setGallery(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-900">Edit Item</h2>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Image */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Item Image</label>
                <div
                  onClick={() => document.getElementById('edit-item-image')?.click()}
                  className="w-full h-48 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-100 transition-colors overflow-hidden"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="Item" className="w-full h-full object-cover" />
                  ) : uploadingImage ? (
                    <Loader2 size={32} className="animate-spin text-emerald-600" />
                  ) : (
                    <>
                      <Camera size={32} className="text-neutral-400" />
                      <span className="text-sm text-neutral-500">Click to upload image</span>
                    </>
                  )}
                </div>
                <input
                  id="edit-item-image"
                  type="file"
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Item title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                  placeholder="Item description"
                />
              </div>

              {/* Gallery */}
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2">Gallery Images</label>
                <div className="flex flex-wrap gap-2">
                  {gallery.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-200">
                      <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}
                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-emerald-500 transition-colors">
                    <Plus size={20} className="text-neutral-400" />
                    <input
                      type="file"
                      onChange={handleGalleryUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest">Custom Fields</label>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} /> Add Field
                  </button>
                </div>
                <div className="space-y-2">
                  {customFields.map((field, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateCustomField(i, e.target.value, field.value)}
                        placeholder="Field name"
                        className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => updateCustomField(i, field.key, e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(i)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-neutral-100">
              <button
                onClick={handleSave}
                disabled={loading || !title.trim() || !description.trim()}
                className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
