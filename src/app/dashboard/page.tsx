'use client';

import { useCallback, useRef, useState } from 'react';
import PlatformCard from '@/components/PlatformCard';

interface PlatformData {
  description: string;
  date: string;
}

const INITIAL_PLATFORM: PlatformData = { description: '', date: '' };
const MAX_FILE_SIZE_MB = 100;

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [baseDescription, setBaseDescription] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [igData, setIgData] = useState<PlatformData>({ ...INITIAL_PLATFORM });
  const [ttData, setTtData] = useState<PlatformData>({ ...INITIAL_PLATFORM });
  const [ytData, setYtData] = useState<PlatformData>({ ...INITIAL_PLATFORM });

  // --- File handling ---
  const processFile = useCallback((newFile: File) => {
    if (newFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`Le fichier dépasse la limite de ${MAX_FILE_SIZE_MB} Mo.`);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!allowed.includes(newFile.type)) {
      alert('Format non supporté. Utilisez MP4, MOV, WEBM, JPG, PNG ou WEBP.');
      return;
    }
    setFile(newFile);
    if (newFile.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(newFile));
    } else {
      setPreview(null);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  // --- Drag & Drop ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }, [processFile]);

  // --- Gemini Optimization ---
  const handleOptimize = useCallback(async () => {
    if (!file && !baseDescription.trim()) {
      alert("Veuillez uploader un média ou entrer un sujet de base.");
      return;
    }
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');

      setIgData(prev => ({ ...prev, description: data.instagram ?? '' }));
      setTtData(prev => ({ ...prev, description: data.tiktok ?? '' }));
      setYtData(prev => ({ ...prev, description: data.youtube ?? '' }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      alert(`Erreur Gemini : ${msg}`);
    } finally {
      setIsOptimizing(false);
    }
  }, [file, baseDescription]);

  // --- Submit ---
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { alert("Veuillez ajouter un média."); return; }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('igData', JSON.stringify(igData));
      formData.append('ttData', JSON.stringify(ttData));
      formData.append('ytData', JSON.stringify(ytData));

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      alert("Planification enregistrée avec succès !");
      setFile(null);
      setPreview(null);
      setBaseDescription('');
      setIgData({ ...INITIAL_PLATFORM });
      setTtData({ ...INITIAL_PLATFORM });
      setYtData({ ...INITIAL_PLATFORM });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      alert(`Erreur : ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [file, igData, ttData, ytData]);

  const isBusy = isOptimizing || isSubmitting;

  return (
    <div className="glass-panel main-panel mt-4">
      <form onSubmit={handleSubmit}>
          {/* Upload */}
          <fieldset disabled={isBusy} className="fieldset-reset">
            <div className="form-group">
              <label className="form-label">Média (Vidéo / Photo)</label>
              <div
                className={`upload-area${isDragOver ? ' dragover' : ''}${file ? ' has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Zone de téléchargement"
              >
                {preview ? (
                  <img src={preview} alt="Aperçu" className="upload-preview" />
                ) : (
                  <div className="upload-icon">📤</div>
                )}
                <h3>{file ? file.name : 'Cliquez ou glissez un fichier ici'}</h3>
                <p>{file ? `${(file.size / 1024 / 1024).toFixed(1)} Mo · Prêt` : 'MP4, MOV, WEBM, JPG, PNG ou WEBP (max 100 Mo)'}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
                />
              </div>
            </div>

            {/* Base prompt */}
            <div className="form-group">
              <label htmlFor="base-desc" className="form-label">Sujet ou description de base (pour aider l'IA)</label>
              <textarea
                id="base-desc"
                className="form-textarea"
                rows={3}
                value={baseDescription}
                onChange={e => setBaseDescription(e.target.value)}
                placeholder="Ex: Vidéo backstage photoshoot à Paris..."
              />
            </div>

            {/* Magic Button */}
            <button
              type="button"
              className={`btn btn-magic${isOptimizing ? ' loading' : ''}`}
              onClick={handleOptimize}
              disabled={isBusy}
            >
              {isOptimizing ? (
                <><span className="spinner" /> Optimisation en cours…</>
              ) : (
                <>✨ Optimiser les descriptions avec Gemini</>
              )}
            </button>

            {/* Platforms */}
            <div className="platforms-grid">
              <PlatformCard
                id="ig" icon="IG" iconClass="icon-ig"
                title="Instagram Reels / Post"
                data={igData} onChange={setIgData}
                placeholder="La description Instagram s'affichera ici…"
              />
              <PlatformCard
                id="tt" icon="TT" iconClass="icon-tt"
                title="TikTok"
                data={ttData} onChange={setTtData}
                placeholder="La description TikTok s'affichera ici…"
              />
              <PlatformCard
                id="yt" icon="YT" iconClass="icon-yt"
                title="YouTube Shorts"
                data={ytData} onChange={setYtData}
                placeholder="La description YouTube s'affichera ici…"
              />
            </div>

            {/* Submit */}
            <div className="submit-row">
              <button
                type="submit"
                className={`btn btn-primary btn-lg${isSubmitting ? ' loading' : ''}`}
                disabled={isBusy}
              >
                {isSubmitting ? (
                  <><span className="spinner" /> Enregistrement…</>
                ) : (
                  'Enregistrer la planification'
                )}
              </button>
            </div>
          </fieldset>
      </form>
    </div>
  );
}
