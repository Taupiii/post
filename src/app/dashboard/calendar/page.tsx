'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PlatformEditCard from '@/components/PlatformEditCard';
import { toZonedTime } from 'date-fns-tz';

const PARIS_TZ = 'Europe/Paris';

// Convertit une date ISO (UTC) → heure de Paris pour input datetime-local
function toParisInput(isoString: string): string {
  const parisDate = toZonedTime(new Date(isoString), PARIS_TZ);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parisDate.getFullYear()}-${pad(parisDate.getMonth() + 1)}-${pad(parisDate.getDate())}T${pad(parisDate.getHours())}:${pad(parisDate.getMinutes())}`;
}

// Formate une date ISO en format français 24h (heure de Paris)
function formatFR(isoString: string | null): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PARIS_TZ,
  });
}

// ---- VideoPlayer : miniature + player on click ----
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) {
      vid.pause();
      setPlaying(false);
    } else {
      vid.play();
      setPlaying(true);
    }
  };

  return (
    <div className="video-player-wrapper" onClick={handlePlay} title={playing ? 'Pause' : 'Lire la vidéo'}>
      <video
        ref={videoRef}
        src={src}
        className="media-thumb"
        preload="metadata"
        playsInline
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <div className="video-play-overlay">
          <div className="video-play-btn">▶</div>
        </div>
      )}
    </div>
  );
}

interface PostRecord {
  id: string;
  mediaUrl: string;
  mediaType: string;
  createdAt: string;
  igDescription: string | null;
  igDate: string | null;
  igPublished: boolean;
  ttDescription: string | null;
  ttDate: string | null;
  ttPublished: boolean;
  ytDescription: string | null;
  ytDate: string | null;
  ytPublished: boolean;
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<PostRecord | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (res.ok) setPosts(data.posts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les plannings pour cette vidéo ? (La vidéo restera sur le disque de dev)')) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const closeModal = () => setEditingPost(null);

  return (
    <div className="glass-panel main-panel mt-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Vos publications prévues</h3>
        <button onClick={fetchPosts} className="btn btn-outline btn-sm">Actualiser</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner"></span></div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Aucune publication prévue.
        </div>
      ) : (
        <div className="posts-list">
          {posts.map(post => (
            <div key={post.id} className="post-item glass-panel platform-card-inner">
              <div className="post-media">
                {post.mediaType === 'video' ? (
                  <VideoPlayer src={post.mediaUrl} />
                ) : (
                  <img src={post.mediaUrl} className="media-thumb" alt="Preview" />
                )}
              </div>
              <div className="post-content">
                <div className="post-platforms">
                   {post.igDate && <span className={`badge badge-ig ${post.igPublished ? 'published' : ''}`}>IG {post.igPublished ? '✓' : ''}</span>}
                   {post.ttDate && <span className={`badge badge-tt ${post.ttPublished ? 'published' : ''}`}>TT {post.ttPublished ? '✓' : ''}</span>}
                   {post.ytDate && <span className={`badge badge-yt ${post.ytPublished ? 'published' : ''}`}>YT {post.ytPublished ? '✓' : ''}</span>}
                </div>
                <div className="post-dates" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {post.igDate && <span>📸 {formatFR(post.igDate)}</span>}
                  {post.ttDate && <span>🎵 {formatFR(post.ttDate)}</span>}
                  {post.ytDate && <span>▶️ {formatFR(post.ytDate)}</span>}
                </div>
                <div className="post-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setEditingPost(post)}>Modifier</button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDelete(post.id)}>Annuler</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL D'ÉDITION */}
      {editingPost && (
         <EditModal post={editingPost} onClose={closeModal} onRefresh={fetchPosts} />
      )}
    </div>
  );
}

// ------ Composant subalterne ------
function EditModal({ post, onClose, onRefresh }: { post: PostRecord, onClose: () => void, onRefresh: () => void }) {
  const [igData, setIgData] = useState({ description: post.igDescription || '', date: post.igDate ? toParisInput(post.igDate) : '' });
  const [ttData, setTtData] = useState({ description: post.ttDescription || '', date: post.ttDate ? toParisInput(post.ttDate) : '' });
  const [ytData, setYtData] = useState({ description: post.ytDescription || '', date: post.ytDate ? toParisInput(post.ytDate) : '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        igDescription: igData.description, igDate: igData.date || null,
        ttDescription: ttData.description, ttDate: ttData.date || null,
        ytDescription: ytData.description, ytDate: ytData.date || null,
      };
      
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        onRefresh();
        onClose();
      } else {
        alert("Erreur lors de la sauvegarde.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur système");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
        <h3>Modifier la Planification</h3>
        <p style={{marginBottom: '1rem', fontSize: '0.9rem'}}>Laissez le texte ou la date vide si vous ne souhaitez plus publier sur cette plateforme.</p>
        
        <div className="modal-scrollable">
          {post.igDate !== null && !post.igPublished && (
            <PlatformEditCard id="edit-ig" title="Instagram" data={igData} onChange={setIgData} maxLength={2200} />
          )}
          {post.ttDate !== null && !post.ttPublished && (
            <PlatformEditCard id="edit-tt" title="TikTok" data={ttData} onChange={setTtData} maxLength={2200} />
          )}
          {post.ytDate !== null && !post.ytPublished && (
            <PlatformEditCard id="edit-yt" title="YouTube Shorts" data={ytData} onChange={setYtData} maxLength={5000} />
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={loading}>Annuler</button>
          <button className={`btn btn-primary ${loading ? 'loading':''}`} onClick={handleSave} disabled={loading}>
            {loading ? <span className="spinner"></span> : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
