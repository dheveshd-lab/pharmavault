import React, { useState, useRef } from 'react';
import { X, Pill, AlertTriangle, Upload, Trash2, RefreshCw, Loader2, Image as ImageIcon } from 'lucide-react';
import { Medicine, MedicineStatus } from '../types';
import { apiUploadImage } from '../utils/api';

interface AddMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medicine: Medicine) => void;
  initialData?: Medicine | null;
}

const COMMON_CATEGORIES = [
  'Antibiotics',
  'Analgesics & Antipyretics',
  'Antihistamines',
  'Cardiovascular',
  'Antidiabetic',
  'Respiratory',
  'Gastrointestinal',
  'Dermatological',
  'Neurological',
  'Vitamins & Supplements',
  'Ophthalmic',
  'Musculoskeletal',
  'Other',
];

const COMMON_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup/Suspension',
  'Injection',
  'Ointment/Cream',
  'Drops',
  'Inhaler',
  'Patch',
  'Powder/Granules',
  'Solution',
  'Other',
];

export const AddMedicineModal: React.FC<AddMedicineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [genericName, setGenericName] = useState(initialData?.genericName || '');
  const [category, setCategory] = useState(initialData?.category || 'Antibiotics');
  const [dosageForm, setDosageForm] = useState(initialData?.dosageForm || 'Tablet');
  const [strength, setStrength] = useState(initialData?.strength || '');
  const [unit, setUnit] = useState(initialData?.unit || 'Box of 100');
  const [minStockLevel, setMinStockLevel] = useState(
    initialData?.minStockLevel !== undefined ? String(initialData.minStockLevel) : '20'
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<MedicineStatus>(initialData?.status || 'Active');

  // Image Upload States
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialData?.imageUrl);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    // Validate type: JPG, JPEG, PNG, WebP
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImageError('Unsupported file type. Please upload a JPG, JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      setImageError('Image exceeds the maximum allowed file size of 8MB.');
      return;
    }

    // Generate local preview immediately
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      setImagePreview(base64Data);

      // Upload to server persistent storage
      setUploadingImage(true);
      try {
        const uploadedUrl = await apiUploadImage(base64Data, file.name);
        setImageUrl(uploadedUrl);
      } catch (err: any) {
        setImageError(err.message || 'Failed to upload image. Preview will be saved as data URI.');
        // Fallback: use the base64 preview directly
        setImageUrl(base64Data);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Medicine name is required.';
    if (!category.trim()) errs.category = 'Category is required.';
    if (!dosageForm.trim()) errs.dosageForm = 'Dosage/Form is required.';
    const minStock = Number(minStockLevel);
    if (isNaN(minStock) || minStock < 0) {
      errs.minStockLevel = 'Minimum stock level must be 0 or higher.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const medicineRecord: Medicine = {
      id: initialData?.id || `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      category: category.trim(),
      dosageForm: dosageForm.trim(),
      strength: strength.trim() || undefined,
      unit: unit.trim() || undefined,
      minStockLevel: Math.max(0, parseInt(minStockLevel, 10) || 0),
      description: description.trim() || undefined,
      status,
      imageUrl: imageUrl || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(medicineRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="add-medicine-modal-dialog"
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {initialData ? 'Edit Medicine' : '+ Add New Medicine'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register a pharmaceutical item into the central inventory catalog.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Medicine Image Upload Section */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Medicine Image
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                JPG, PNG, WebP up to 8MB
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Image Preview Box */}
              <div className="relative w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Medicine Preview"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Pill className="w-8 h-8 text-teal-600/70 dark:text-teal-400/70" />
                    <span className="text-[9px] font-semibold mt-1">Placeholder</span>
                  </div>
                )}

                {uploadingImage && (
                  <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center text-white text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="space-y-1.5 flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                  id="medicine-image-file-input"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {imagePreview ? 'Replace Image' : 'Upload Image'}
                  </button>

                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {imagePreview
                    ? 'Uploaded image will be stored persistently and shown across inventory cards.'
                    : 'If no image is uploaded, PharmaVault displays a professional pharmaceutical placeholder.'}
                </p>

                {imageError && (
                  <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {imageError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medicine Name * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Medicine Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="medicine-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Amoxicillin Clavulanate"
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.name
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500`}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>

            {/* Generic Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Generic Name (INN)
              </label>
              <input
                id="medicine-generic-input"
                type="text"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g., Amoxicillin / Clavulanic Acid"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Category * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="medicine-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.category
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500`}
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-xs text-rose-500">{errors.category}</p>}
            </div>

            {/* Dosage/Form * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dosage / Form <span className="text-rose-500">*</span>
              </label>
              <select
                id="medicine-dosage-form-select"
                value={dosageForm}
                onChange={(e) => setDosageForm(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.dosageForm
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500`}
              >
                {COMMON_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
              {errors.dosageForm && (
                <p className="mt-1 text-xs text-rose-500">{errors.dosageForm}</p>
              )}
            </div>

            {/* Strength */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Strength
              </label>
              <input
                id="medicine-strength-input"
                type="text"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g., 500mg, 10mg/5mL"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Packaging Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure / Packaging
              </label>
              <input
                id="medicine-unit-input"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., Box of 100, Bottle, Vials"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Minimum Stock Level * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Stock Level (Safety Buffer) <span className="text-rose-500">*</span>
              </label>
              <input
                id="medicine-min-stock-input"
                type="number"
                min="0"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  errors.minStockLevel
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500`}
              />
              {errors.minStockLevel ? (
                <p className="mt-1 text-xs text-rose-500">{errors.minStockLevel}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  Triggers reorder recommendations when stock drops to or below this amount.
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                id="medicine-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as MedicineStatus)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Clinical Notes
            </label>
            <textarea
              id="medicine-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Prescribing guidelines, storage requirements (e.g. 2-8°C refrigerated), or special precautions..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-medicine-submit-btn"
              type="submit"
              disabled={uploadingImage}
              className="px-5 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 rounded-xl shadow-sm shadow-teal-700/20 transition-all cursor-pointer flex items-center gap-2"
            >
              {uploadingImage && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'Update Medicine' : 'Save Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
