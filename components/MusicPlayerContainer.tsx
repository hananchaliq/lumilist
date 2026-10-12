"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, SkipForward, SkipBack, Upload, Volume2, VolumeX, ListMusic, Trash2, Shuffle, Repeat, Music, RotateCcw, Plus, ChevronUp, ChevronDown, FolderPlus, Edit2, Check, X, Link2, Disc, Sparkles, Settings2, AlertCircle } from "lucide-react";
import { saveTrackToIndexedDB, getAllTracksFromIndexedDB, deleteTrackFromIndexedDB, clearAllTracksFromIndexedDB } from "@/lib/audio-storage";
export interface AudioTrack {
   id: string;
   title: string;
   artist: string;
   src: string;
   duration: number;
   isUploaded?: boolean;
   isDefault?: boolean;
   isCustomUrl?: boolean;
}
export interface PlaylistInfo {
   id: string;
   name: string;
   description?: string;
   isCustom?: boolean;
   trackIds: string[];
}
export const BUILTIN_TRACKS: AudioTrack[] = [
   { id: "lofi-midnight", title: "Midnight Chill Lofi", artist: "Lumi Beats & Vinyl", src: "/audio/lofi_midnight_chill.wav", duration: 60, isDefault: true },
   { id: "ambient-forest", title: "Rainforest Mist & Chords", artist: "Lumi Ambient Soundscape", src: "/audio/ambient_forest_mist.wav", duration: 60, isDefault: true },
   { id: "deep-focus", title: "Deep Focus Flow", artist: "Lumi Downtempo Chill", src: "/audio/deep_focus_flow.wav", duration: 60, isDefault: true },
];
const INITIAL_PLAYLISTS: PlaylistInfo[] = [
   { id: "pl_all", name: "Semua Lagu", description: "Daftar semua lagu di pemutar", isCustom: false, trackIds: ["lofi-midnight", "ambient-forest", "deep-focus"] },
   { id: "pl_chill", name: "Chill & Santai", description: "Musik relaksasi dan penenang pikiran", isCustom: true, trackIds: ["lofi-midnight", "deep-focus"] },
];
const STORAGE_KEY_PLAYLISTS = "lumilist_music_playlists_v3";
const STORAGE_KEY_ACTIVE_PLAYLIST = "lumilist_music_active_playlist_id_v3";
const STORAGE_KEY_DELETED_DEFAULTS = "lumilist_music_deleted_defaults_v3";
const STORAGE_KEY_CUSTOM_URL_TRACKS = "lumilist_music_custom_url_tracks_v3";
const STORAGE_KEY_CURRENT_INDEX = "lumilist_music_current_idx_v3";
export default function MusicPlayerContainer() {
   const [allTracks, setAllTracks] = useState<AudioTrack[]>(BUILTIN_TRACKS);
   const [deletedDefaultIds, setDeletedDefaultIds] = useState<string[]>(() => {
      if (typeof window !== "undefined") {
         try {
            const raw = localStorage.getItem(STORAGE_KEY_DELETED_DEFAULTS);
            if (raw) return JSON.parse(raw);
         } catch {}
      }
      return [];
   });
   const [playlists, setPlaylists] = useState<PlaylistInfo[]>(() => {
      if (typeof window !== "undefined") {
         try {
            const raw = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
            if (raw) {
               const parsed = JSON.parse(raw);
               if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
         } catch {}
      }
      return INITIAL_PLAYLISTS;
   });
   const [activePlaylistId, setActivePlaylistId] = useState<string>(() => {
      if (typeof window !== "undefined") {
         try {
            const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_PLAYLIST);
            if (saved) return saved;
         } catch {}
      }
      return "pl_all";
   });
   const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(() => {
      if (typeof window !== "undefined") {
         try {
            const savedIdx = localStorage.getItem(STORAGE_KEY_CURRENT_INDEX);
            if (savedIdx !== null) {
               const parsed = parseInt(savedIdx, 10);
               if (!isNaN(parsed) && parsed >= 0) return parsed;
            }
         } catch {}
      }
      return 0;
   });
   const [isPlaying, setIsPlaying] = useState<boolean>(false);
   const [currentTime, setCurrentTime] = useState<number>(0);
   const [duration, setDuration] = useState<number>(60);
   const [volume, setVolume] = useState<number>(0.8);
   const [isMuted, setIsMuted] = useState<boolean>(false);
   const [isShuffle, setIsShuffle] = useState<boolean>(false);
   const [isLooping, setIsLooping] = useState<boolean>(false);
   const [showPlaylistDrawer, setShowPlaylistDrawer] = useState<boolean>(false);
   const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
   const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
   const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
   const [playError, setPlayError] = useState<string | null>(null);
   const [newPlaylistName, setNewPlaylistName] = useState("");
   const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
   const [editingPlaylistName, setEditingPlaylistName] = useState("");
   const [showAddUrlForm, setShowAddUrlForm] = useState(false);
   const [customUrlForm, setCustomUrlForm] = useState({ title: "", artist: "", url: "" });
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const fileInputRef = useRef<HTMLInputElement | null>(null);
   const objectUrlsRef = useRef<string[]>([]);
   useEffect(() => {
      let isMounted = true;
      async function loadStoredLibrary() {
         try {
            let customUrlList: AudioTrack[] = [];
            try {
               const rawCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_URL_TRACKS);
               if (rawCustom) {
                  customUrlList = JSON.parse(rawCustom);
               }
            } catch {}
            const storedBlobs = await getAllTracksFromIndexedDB();
            if (!isMounted) return;
            const uploadedTracks: AudioTrack[] = (storedBlobs || []).map(item => {
               const blobUrl = URL.createObjectURL(item.blob);
               objectUrlsRef.current.push(blobUrl);
               return { id: item.id, title: item.title, artist: item.artist, src: blobUrl, duration: item.duration || 60, isUploaded: true };
            });
            const rawDel = localStorage.getItem(STORAGE_KEY_DELETED_DEFAULTS);
            const delIds: string[] = rawDel ? JSON.parse(rawDel) : [];
            const activeDefaults = BUILTIN_TRACKS.filter(t => !delIds.includes(t.id));
            const combined = [...activeDefaults, ...uploadedTracks, ...customUrlList];
            setAllTracks(combined);
         } catch (err) {
            console.warn("Error initializing audio library:", err);
         }
      }
      loadStoredLibrary();
      return () => {
         isMounted = false;
         objectUrlsRef.current.forEach(url => {
            try {
               URL.revokeObjectURL(url);
            } catch {}
         });
         objectUrlsRef.current = [];
      };
   }, []);
   useEffect(() => {
      try {
         localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
      } catch {}
   }, [playlists]);
   useEffect(() => {
      try {
         localStorage.setItem(STORAGE_KEY_ACTIVE_PLAYLIST, activePlaylistId);
      } catch {}
   }, [activePlaylistId]);
   useEffect(() => {
      try {
         localStorage.setItem(STORAGE_KEY_DELETED_DEFAULTS, JSON.stringify(deletedDefaultIds));
      } catch {}
   }, [deletedDefaultIds]);
   const activePlaylist = useMemo(() => {
      return playlists.find(p => p.id === activePlaylistId) || playlists[0] || INITIAL_PLAYLISTS[0];
   }, [playlists, activePlaylistId]);
   const currentPlaylistTracks = useMemo(() => {
      if (!activePlaylist) return [];
      const trackMap = new Map(allTracks.map(t => [t.id, t]));
      return activePlaylist.trackIds.map(id => trackMap.get(id)).filter((t): t is AudioTrack => t !== undefined);
   }, [activePlaylist, allTracks]);
   const safeIndex = currentPlaylistTracks.length > 0 ? (currentTrackIndex >= 0 && currentTrackIndex < currentPlaylistTracks.length ? currentTrackIndex : 0) : 0;
   const currentTrack: AudioTrack | undefined = currentPlaylistTracks[safeIndex];
   useEffect(() => {
      try {
         localStorage.setItem(STORAGE_KEY_CURRENT_INDEX, String(safeIndex));
      } catch {}
   }, [safeIndex]);
   useEffect(() => {
      if (audioRef.current) {
         audioRef.current.volume = isMuted ? 0 : volume;
      }
   }, [volume, isMuted]);
   useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      setPlayError(null);
      setCurrentTime(0);
      if (!currentTrack || !currentTrack.src) {
         if (isPlaying) setIsPlaying(false);
         return;
      }
      if (audio.src !== currentTrack.src) {
         audio.src = currentTrack.src;
         audio.load();
      }
      if (isPlaying) {
         setIsLoadingAudio(true);
         const playPromise = audio.play();
         if (playPromise !== undefined) {
            playPromise
               .then(() => {
                  setIsLoadingAudio(false);
                  setPlayError(null);
               })
               .catch(err => {
                  setIsLoadingAudio(false);
                  if (err.name !== "AbortError") {
                     console.warn("Playback error:", err.message);
                     setPlayError("Klik Play untuk memulai");
                     setIsPlaying(false);
                  }
               });
         }
      }
   }, [currentTrack?.src, safeIndex]);
   const togglePlay = useCallback(() => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!currentTrack || !currentTrack.src) {
         setPlayError("Playlist kosong. Tambahkan lagu terlebih dahulu.");
         return;
      }
      if (!isPlaying) {
         if (!audio.src || !audio.src.includes(currentTrack.src)) {
            audio.src = currentTrack.src;
            audio.load();
         }
         setIsLoadingAudio(true);
         setPlayError(null);
         audio
            .play()
            .then(() => {
               setIsPlaying(true);
               setIsLoadingAudio(false);
            })
            .catch(err => {
               setIsLoadingAudio(false);
               console.warn("Play error:", err.message);
               setPlayError("Gagal memutar, klik sekali lagi");
            });
      } else {
         audio.pause();
         setIsPlaying(false);
      }
   }, [isPlaying, currentTrack]);
   const handleNextTrack = useCallback(() => {
      if (currentPlaylistTracks.length <= 1) return;
      if (isShuffle) {
         let nextIdx = Math.floor(Math.random() * currentPlaylistTracks.length);
         if (nextIdx === safeIndex) {
            nextIdx = (nextIdx + 1) % currentPlaylistTracks.length;
         }
         setCurrentTrackIndex(nextIdx);
      } else {
         setCurrentTrackIndex(prev => (prev + 1) % currentPlaylistTracks.length);
      }
   }, [currentPlaylistTracks.length, isShuffle, safeIndex]);
   const handlePrevTrack = useCallback(() => {
      if (currentTime > 3) {
         setCurrentTime(0);
         if (audioRef.current) audioRef.current.currentTime = 0;
         return;
      }
      if (currentPlaylistTracks.length <= 1) return;
      setCurrentTrackIndex(prev => (prev - 1 + currentPlaylistTracks.length) % currentPlaylistTracks.length);
   }, [currentTime, currentPlaylistTracks.length]);
   const handleFileUpload = async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const newTracks: AudioTrack[] = [];
      const newTrackIds: string[] = [];
      for (let i = 0; i < files.length; i++) {
         const file = files[i];
         if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)) {
            continue;
         }
         const trackId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
         const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
         const blobUrl = URL.createObjectURL(file);
         objectUrlsRef.current.push(blobUrl);
         await saveTrackToIndexedDB({ id: trackId, title: cleanTitle, artist: "Lagu Saya (Upload)", duration: 180, file: file });
         const trackObj: AudioTrack = { id: trackId, title: cleanTitle, artist: "Lagu Saya (Upload)", src: blobUrl, duration: 180, isUploaded: true };
         newTracks.push(trackObj);
         newTrackIds.push(trackId);
      }
      if (newTracks.length > 0) {
         setAllTracks(prev => [...prev, ...newTracks]);
         setPlaylists(prev =>
            prev.map(pl => {
               if (pl.id === activePlaylist.id) {
                  return { ...pl, trackIds: [...pl.trackIds, ...newTrackIds] };
               }
               return pl;
            })
         );
         const newIndex = currentPlaylistTracks.length;
         setCurrentTrackIndex(newIndex);
         setIsPlaying(true);
      }
   };
   const handleAddCustomUrlTrack = () => {
      if (!customUrlForm.title.trim() || !customUrlForm.url.trim()) return;
      const newId = `custom_url_${Date.now()}`;
      const newTrack: AudioTrack = { id: newId, title: customUrlForm.title.trim(), artist: customUrlForm.artist.trim() || "Audio Web Stream", src: customUrlForm.url.trim(), duration: 180, isCustomUrl: true };
      setAllTracks(prev => [...prev, newTrack]);
      try {
         const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_URL_TRACKS);
         const existing = raw ? JSON.parse(raw) : [];
         localStorage.setItem(STORAGE_KEY_CUSTOM_URL_TRACKS, JSON.stringify([...existing, newTrack]));
      } catch {}
      setPlaylists(prev =>
         prev.map(pl => {
            if (pl.id === activePlaylist.id) {
               return { ...pl, trackIds: [...pl.trackIds, newId] };
            }
            return pl;
         })
      );
      setCustomUrlForm({ title: "", artist: "", url: "" });
      setShowAddUrlForm(false);
   };
   const handleDeleteTrack = async (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const trackToDelete = allTracks.find(t => t.id === id);
      if (trackToDelete?.isDefault || BUILTIN_TRACKS.some(b => b.id === id)) {
         setDeletedDefaultIds(prev => {
            const next = Array.from(new Set([...prev, id]));
            try {
               localStorage.setItem(STORAGE_KEY_DELETED_DEFAULTS, JSON.stringify(next));
            } catch {}
            return next;
         });
      }
      if (trackToDelete?.isUploaded) {
         await deleteTrackFromIndexedDB(id);
      }
      if (trackToDelete?.isCustomUrl) {
         try {
            const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_URL_TRACKS);
            if (raw) {
               const list = JSON.parse(raw);
               const filtered = list.filter((item: AudioTrack) => item.id !== id);
               localStorage.setItem(STORAGE_KEY_CUSTOM_URL_TRACKS, JSON.stringify(filtered));
            }
         } catch {}
      }
      setAllTracks(prev => prev.filter(t => t.id !== id));
      setPlaylists(prev => prev.map(pl => ({ ...pl, trackIds: pl.trackIds.filter(tId => tId !== id) })));
      if (safeIndex >= currentPlaylistTracks.length - 1) {
         setCurrentTrackIndex(Math.max(0, currentPlaylistTracks.length - 2));
      }
   };
   const handleRemoveFromCurrentPlaylist = (trackId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setPlaylists(prev =>
         prev.map(pl => {
            if (pl.id === activePlaylist.id) {
               return { ...pl, trackIds: pl.trackIds.filter(id => id !== trackId) };
            }
            return pl;
         })
      );
   };
   const handleMoveTrack = (index: number, direction: "up" | "down", e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const newIdx = direction === "up" ? index - 1 : index + 1;
      if (newIdx < 0 || newIdx >= currentPlaylistTracks.length) return;
      setPlaylists(prev =>
         prev.map(pl => {
            if (pl.id === activePlaylist.id) {
               const copy = [...pl.trackIds];
               const temp = copy[index];
               copy[index] = copy[newIdx];
               copy[newIdx] = temp;
               return { ...pl, trackIds: copy };
            }
            return pl;
         })
      );
      if (safeIndex === index) {
         setCurrentTrackIndex(newIdx);
      } else if (safeIndex === newIdx) {
         setCurrentTrackIndex(index);
      }
   };
   const handleDeleteAllDefaultTracks = () => {
      const allDefaultIds = BUILTIN_TRACKS.map(t => t.id);
      setDeletedDefaultIds(prev => {
         const merged = Array.from(new Set([...prev, ...allDefaultIds]));
         try {
            localStorage.setItem(STORAGE_KEY_DELETED_DEFAULTS, JSON.stringify(merged));
         } catch {}
         return merged;
      });
      setAllTracks(prev => prev.filter(t => !allDefaultIds.includes(t.id)));
      setPlaylists(prev => prev.map(pl => ({ ...pl, trackIds: pl.trackIds.filter(id => !allDefaultIds.includes(id)) })));
      setCurrentTrackIndex(0);
      if (isPlaying && currentTrack?.isDefault) {
         setIsPlaying(false);
         if (audioRef.current) audioRef.current.pause();
      }
   };
   const handleRestoreDefaultTracks = () => {
      setDeletedDefaultIds([]);
      try {
         localStorage.setItem(STORAGE_KEY_DELETED_DEFAULTS, JSON.stringify([]));
      } catch {}
      setAllTracks(prev => {
         const existingIds = new Set(prev.map(t => t.id));
         const toAdd = BUILTIN_TRACKS.filter(t => !existingIds.has(t.id));
         return [...toAdd, ...prev];
      });
      setPlaylists(prev =>
         prev.map(pl => {
            if (pl.id === activePlaylist.id) {
               const existing = new Set(pl.trackIds);
               const addIds = BUILTIN_TRACKS.map(t => t.id).filter(id => !existing.has(id));
               return { ...pl, trackIds: [...pl.trackIds, ...addIds] };
            }
            return pl;
         })
      );
   };
   const handleCreatePlaylist = () => {
      if (!newPlaylistName.trim()) return;
      const newId = `pl_${Date.now()}`;
      const newPl: PlaylistInfo = { id: newId, name: newPlaylistName.trim(), description: "Playlist Kustom Saya", isCustom: true, trackIds: [] };
      setPlaylists(prev => [...prev, newPl]);
      setActivePlaylistId(newId);
      setNewPlaylistName("");
      setCurrentTrackIndex(0);
   };
   const handleSaveRenamePlaylist = () => {
      if (!editingPlaylistId || !editingPlaylistName.trim()) return;
      setPlaylists(prev => prev.map(pl => (pl.id === editingPlaylistId ? { ...pl, name: editingPlaylistName.trim() } : pl)));
      setEditingPlaylistId(null);
      setEditingPlaylistName("");
   };
   const handleDeletePlaylist = (id: string) => {
      if (playlists.length <= 1) return;
      setPlaylists(prev => prev.filter(p => p.id !== id));
      if (activePlaylistId === id) {
         const remaining = playlists.filter(p => p.id !== id);
         setActivePlaylistId(remaining[0].id);
         setCurrentTrackIndex(0);
      }
   };
   const formatTime = (secs: number) => {
      if (isNaN(secs) || secs < 0) return "0:00";
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? "0" : ""}${s}`;
   };
   const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetTime = Number(e.target.value);
      setCurrentTime(targetTime);
      if (audioRef.current) {
         audioRef.current.currentTime = targetTime;
      }
   };
   const hasDefaultTracksRemaining = BUILTIN_TRACKS.some(b => !deletedDefaultIds.includes(b.id) && allTracks.some(t => t.id === b.id));
   return (
      <>
         {" "}
         <section
            aria-label="Spotify Music Player"
            onDragOver={e => {
               e.preventDefault();
               setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={e => {
               e.preventDefault();
               setIsDraggingOver(false);
               handleFileUpload(e.dataTransfer.files);
            }}
            className={`relative w-full h-full rounded-[24px] p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 border ${isDraggingOver ? "border-[#1DB954] shadow-[0_0_30px_rgba(29,185,84,0.35)] bg-[#0A100A]/95" : "border-white/[0.08] hover:border-white/[0.14]"}`}
            style={{ background: "rgba(8, 11, 8, 0.65)", backdropFilter: "blur(28px) saturate(150%)", WebkitBackdropFilter: "blur(28px) saturate(150%)", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)" }}>
            {" "}
            {/* Real HTML5 Audio Element */}{" "}
            <audio
               ref={audioRef}
               preload="auto"
               onTimeUpdate={() => {
                  if (audioRef.current) {
                     setCurrentTime(audioRef.current.currentTime);
                  }
               }}
               onDurationChange={() => {
                  if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
                     setDuration(audioRef.current.duration);
                  }
               }}
               onLoadedMetadata={() => {
                  if (audioRef.current && !isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
                     setDuration(audioRef.current.duration);
                  }
               }}
               onPlay={() => setIsPlaying(true)}
               onPause={() => {
                  if (!audioRef.current?.ended) setIsPlaying(false);
               }}
               onEnded={() => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  if (isLooping || currentPlaylistTracks.length === 1) {
                     audio.currentTime = 0;
                     setIsPlaying(true);
                     audio.play().catch(() => {
                        setIsPlaying(false);
                        setPlayError("Klik Play untuk melanjutkan");
                     });
                     return;
                  }
                  if (currentPlaylistTracks.length > 1) {
                     let nextIndex: number;
                     if (isShuffle) {
                        nextIndex = Math.floor(Math.random() * currentPlaylistTracks.length);
                        if (nextIndex === safeIndex) {
                           nextIndex = (nextIndex + 1) % currentPlaylistTracks.length;
                        }
                     } else {
                        nextIndex = (safeIndex + 1) % currentPlaylistTracks.length;
                     }
                     setCurrentTrackIndex(nextIndex);
                     setIsPlaying(true);
                     return;
                  }
                  setIsPlaying(false);
               }}
               onError={() => {
                  setIsLoadingAudio(false);
                  if (currentTrack?.src) {
                     setPlayError("Gagal memuat lagu");
                  }
               }}
            />{" "}
            {/* Hidden file input for uploading audio */} <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac" multiple className="hidden" onChange={e => handleFileUpload(e.target.files)} />{" "}
            <div>
               {" "}
               {/* Top Header: Clean & Compact */}{" "}
               <div className="flex items-center justify-between gap-2 mb-3">
                  {" "}
                  <div className="flex items-center gap-2 min-w-0">
                     {" "}
                     <div className="w-5 h-5 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center shrink-0">
                        {" "}
                        <Music className="w-2.5 h-2.5 text-[#1DB954]" />{" "}
                     </div>{" "}
                     <span className="text-xs font-semibold tracking-wider text-[#F4F5F0] uppercase truncate" style={{ fontFamily: "var(--font-syne), sans-serif" }}>
                        {" "}
                        Player{" "}
                     </span>{" "}
                     <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-[#1DB954] " : "bg-white/30"} shrink-0`} />{" "}
                  </div>{" "}
                  {/* Quick Actions Row */}{" "}
                  <div className="flex items-center gap-1.5 shrink-0">
                     {" "}
                     {/* Toggle in-card Drawer */}{" "}
                     <button type="button" onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)} className={`p-1.5 rounded-lg border transition-all cursor-pointer ${showPlaylistDrawer ? "bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1DB954]" : "bg-white/[0.04] border-white/[0.08] text-[#969A91] hover:text-[#F4F5F0]"}`} title="Lihat Lagu di Playlist" aria-label="Toggle playlist drawer">
                        {" "}
                        <ListMusic className="w-3.5 h-3.5" />{" "}
                     </button>{" "}
                     {/* Upload file */}{" "}
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1DB954]/15 hover:bg-[#1DB954]/25 border border-[#1DB954]/30 text-[#1DB954] text-[11px] font-medium transition-all cursor-pointer" title="Upload lagu (.mp3, .wav)" aria-label="Upload audio">
                        {" "}
                        <Upload className="w-3 h-3" /> <span>Upload</span>{" "}
                     </button>{" "}
                     {/* Open full manager modal */}{" "}
                     <button type="button" onClick={() => setShowManagerModal(true)} className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#969A91] hover:text-[#F4F5F0] transition-colors cursor-pointer" title="Atur Playlist & Hapus Lagu Bawaan" aria-label="Open playlist manager">
                        {" "}
                        <Settings2 className="w-3.5 h-3.5" />{" "}
                     </button>{" "}
                  </div>{" "}
               </div>{" "}
               {/* Active Playlist Selector Bar */}{" "}
               <div className="flex items-center justify-between gap-1 mb-2.5 px-1 py-1 rounded-xl bg-black/40 border border-white/[0.06]">
                  {" "}
                  <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto weather-scrollbar py-0.5 px-1">
                     {" "}
                     {playlists.map(pl => (
                        <button
                           key={pl.id}
                           type="button"
                           onClick={() => {
                              setActivePlaylistId(pl.id);
                              setCurrentTrackIndex(0);
                           }}
                           className={`text-[10px] font-medium px-2 py-0.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${pl.id === activePlaylist.id ? "bg-[#1DB954] text-black font-semibold " : "text-[#969A91] hover:text-[#F4F5F0] hover:bg-white/[0.06]"}`}>
                           {" "}
                           {pl.name}{" "}
                        </button>
                     ))}{" "}
                  </div>{" "}
                  <button type="button" onClick={() => setShowManagerModal(true)} className="p-1 rounded text-white/40 hover:text-[#1DB954] shrink-0 cursor-pointer transition-colors" title="Tambah / Atur Playlist">
                     {" "}
                     <Plus className="w-3.5 h-3.5" />{" "}
                  </button>{" "}
               </div>{" "}
               {/* Playlist Drawer (Collapsible) */}{" "}
               {showPlaylistDrawer && (
                  <div className="mb-3 p-2.5 rounded-2xl bg-black/90 border border-white/[0.1] max-h-48 overflow-y-auto weather-scrollbar flex flex-col gap-1 text-xs transition-all shadow-xl">
                     {" "}
                     <div className="flex items-center justify-between text-[10px] text-[#969A91] px-1 mb-1 font-medium font-mono">
                        {" "}
                        <span>
                           {" "}
                           {activePlaylist.name.toUpperCase()} ({currentPlaylistTracks.length}){" "}
                        </span>{" "}
                        <div className="flex items-center gap-2">
                           {" "}
                           {hasDefaultTracksRemaining ? (
                              <button type="button" onClick={handleDeleteAllDefaultTracks} className="text-[10px] text-red-400/80 hover:text-red-300 flex items-center gap-0.5 cursor-pointer transition-colors" title="Hapus semua lagu default bawaan">
                                 {" "}
                                 <Trash2 className="w-2.5 h-2.5" /> <span>Hapus Bawaan</span>{" "}
                              </button>
                           ) : (
                              <button type="button" onClick={handleRestoreDefaultTracks} className="text-[10px] text-[#1DB954] hover:text-[#1ed760] flex items-center gap-0.5 cursor-pointer transition-colors" title="Pulihkan lagu default bawaan">
                                 {" "}
                                 <RotateCcw className="w-2.5 h-2.5" /> <span>Pulihkan Bawaan</span>{" "}
                              </button>
                           )}{" "}
                        </div>{" "}
                     </div>{" "}
                     {currentPlaylistTracks.length === 0 ? (
                        <div className="p-3 text-center text-white/50 text-[11px] space-y-1.5">
                           {" "}
                           <p>Playlist ini kosong.</p>{" "}
                           <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/30 hover:bg-[#1DB954]/30 cursor-pointer text-[10px]">
                              {" "}
                              <Upload className="w-3 h-3" /> <span>Upload Lagu Anda</span>{" "}
                           </button>{" "}
                        </div>
                     ) : (
                        currentPlaylistTracks.map((track, idx) => {
                           const isCurrent = idx === safeIndex;
                           return (
                              <div
                                 key={track.id}
                                 onClick={() => {
                                    setCurrentTrackIndex(idx);
                                    setIsPlaying(true);
                                 }}
                                 className={`group flex items-center justify-between px-2 py-1.5 rounded-xl cursor-pointer transition-colors ${isCurrent ? "bg-[#1DB954]/15 text-[#1DB954] border border-[#1DB954]/30" : "hover:bg-white/[0.05] text-[#D8DCD2]"}`}>
                                 {" "}
                                 <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                    {" "}
                                    <span className="font-mono text-[10px] text-white/40 shrink-0 w-3">{idx + 1}</span>{" "}
                                    <div className="truncate">
                                       {" "}
                                       <div className="font-medium text-[11px] truncate leading-tight">{track.title}</div> <div className="text-[9px] text-[#969A91] truncate">{track.artist}</div>{" "}
                                    </div>{" "}
                                 </div>{" "}
                                 <div className="flex items-center gap-0.5 shrink-0">
                                    {" "}
                                    {isCurrent && isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] mr-1" />} {/* Move Up */}{" "}
                                    {idx > 0 && (
                                       <button type="button" onClick={e => handleMoveTrack(idx, "up", e)} className="p-1 text-white/30 hover:text-white transition-colors cursor-pointer" title="Pindah ke atas">
                                          {" "}
                                          <ChevronUp className="w-3 h-3" />{" "}
                                       </button>
                                    )}{" "}
                                    {/* Move Down */}{" "}
                                    {idx < currentPlaylistTracks.length - 1 && (
                                       <button type="button" onClick={e => handleMoveTrack(idx, "down", e)} className="p-1 text-white/30 hover:text-white transition-colors cursor-pointer" title="Pindah ke bawah">
                                          {" "}
                                          <ChevronDown className="w-3 h-3" />{" "}
                                       </button>
                                    )}{" "}
                                    {/* Delete track (can delete any track, including defaults) */}{" "}
                                    <button type="button" onClick={e => handleDeleteTrack(track.id, e)} className="p-1 text-white/30 hover:text-red-400 transition-colors cursor-pointer ml-0.5" title={track.isDefault ? "Hapus lagu bawaan" : "Hapus lagu"}>
                                       {" "}
                                       <Trash2 className="w-3 h-3" />{" "}
                                    </button>{" "}
                                 </div>{" "}
                              </div>
                           );
                        })
                     )}{" "}
                  </div>
               )}{" "}
               {/* Now Playing Visual & Song Metadata */}{" "}
               <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-3">
                  {" "}
                  {/* Animated Vinyl Disc */}{" "}
                  <div className="relative w-11 h-11 shrink-0">
                     {" "}
                     <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-[#202820] to-[#080A08] border border-white/20 shadow-md flex items-center justify-center transition-transform ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`}>
                        {" "}
                        {/* Disc grooves */}{" "}
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                           {" "}
                           <div className="w-5 h-5 rounded-full border border-[#1DB954]/30 flex items-center justify-center bg-[#0C150E]">
                              {" "}
                              <div className="w-2 h-2 rounded-full bg-[#1DB954] shadow-[0_0_6px_#1DB954]" />{" "}
                           </div>{" "}
                        </div>{" "}
                     </div>{" "}
                  </div>{" "}
                  {/* Title & Artist & Equalizer */}{" "}
                  <div className="min-w-0 flex-1">
                     {" "}
                     {currentTrack ? (
                        <>
                           {" "}
                           <div className="flex items-center gap-1.5">
                              {" "}
                              <h4 className="text-[13px] font-semibold text-[#F4F5F0] truncate leading-tight" title={currentTrack.title}>
                                 {" "}
                                 {currentTrack.title}{" "}
                              </h4>{" "}
                              {currentTrack.isUploaded ? <span className="px-1 py-0.2 rounded bg-white/[0.08] text-[9px] font-mono text-white/60 shrink-0">Upload</span> : currentTrack.isCustomUrl ? <span className="px-1 py-0.2 rounded bg-blue-500/20 text-[9px] font-mono text-blue-400 shrink-0">URL</span> : <span className="px-1 py-0.2 rounded bg-[#1DB954]/15 text-[9px] font-mono text-[#1DB954] shrink-0">Lofi</span>}{" "}
                           </div>{" "}
                           <div className="flex items-center justify-between gap-1 mt-1">
                              {" "}
                              <p className="text-[11px] text-[#969A91] truncate leading-none">{currentTrack.artist}</p> {/* Animated Audio Equalizer Bars */}{" "}
                              <div className="flex items-end gap-0.5 h-3 shrink-0 ml-1">
                                 {" "}
                                 {[0, 1, 2, 3, 4].map(bar => (
                                    <span key={bar} className={`w-0.5 rounded-full bg-[#1DB954] transition-all duration-300 ${isPlaying ? (bar % 2 === 0 ? "h-3 " : "h-2 ") : "h-1 opacity-30"}`} style={{ animationDuration: isPlaying ? `${0.5 + bar * 0.15}s` : undefined }} />
                                 ))}{" "}
                              </div>{" "}
                           </div>{" "}
                        </>
                     ) : (
                        <div className="space-y-0.5">
                           {" "}
                           <h4 className="text-[12px] font-medium text-white/60">Tidak Ada Lagu</h4> <p className="text-[10px] text-white/40">Silakan upload lagu baru</p>{" "}
                        </div>
                     )}{" "}
                  </div>{" "}
               </div>{" "}
               {/* Error notification if playback has issue */}{" "}
               {playError && (
                  <div className="mb-2 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center justify-between">
                     {" "}
                     <span className="truncate">{playError}</span>{" "}
                     {currentTrack && (
                        <button type="button" onClick={togglePlay} className="underline text-[10px] ml-1 shrink-0 font-medium cursor-pointer">
                           {" "}
                           Coba lagi{" "}
                        </button>
                     )}{" "}
                  </div>
               )}{" "}
               {/* Scrubbable Seekbar */}{" "}
               <div className="space-y-1 mb-3">
                  {" "}
                  <input type="range" min={0} max={duration || 60} value={currentTime} disabled={!currentTrack} onChange={handleSeek} aria-label="Progress lagu" className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#1DB954] disabled:opacity-40" />{" "}
                  <div className="flex justify-between text-[10px] font-mono text-[#969A91]">
                     {" "}
                     <span>{formatTime(currentTime)}</span> <span>{formatTime(duration)}</span>{" "}
                  </div>{" "}
               </div>{" "}
            </div>{" "}
            {/* Bottom Controls: Symmetrical, centered, zero overflow */}{" "}
            <div className="space-y-2 pt-1 border-t border-white/[0.06]">
               {" "}
               {/* Playback Controls Row */}{" "}
               <div className="flex items-center justify-center gap-3">
                  {" "}
                  {/* Shuffle button */}{" "}
                  <button type="button" onClick={() => setIsShuffle(!isShuffle)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isShuffle ? "text-[#1DB954]" : "text-[#969A91] hover:text-[#F4F5F0]"}`} title={isShuffle ? "Shuffle Aktif" : "Acak Lagu"} aria-label="Shuffle">
                     {" "}
                     <Shuffle className="w-3.5 h-3.5" />{" "}
                  </button>{" "}
                  {/* Prev track */}{" "}
                  <button type="button" onClick={handlePrevTrack} disabled={currentPlaylistTracks.length === 0} className="p-1.5 text-[#D8DCD2] hover:text-[#F4F5F0] transition-colors cursor-pointer disabled:opacity-30" title="Lagu Sebelumnya" aria-label="Previous Track">
                     {" "}
                     <SkipBack className="w-4 h-4" />{" "}
                  </button>{" "}
                  {/* Play / Pause button */}{" "}
                  <button type="button" onClick={togglePlay} disabled={isLoadingAudio || !currentTrack} className="w-9 h-9 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:hover:scale-100" title={isPlaying ? "Jeda" : "Putar Lagu"} aria-label={isPlaying ? "Pause" : "Play"}>
                     {" "}
                     {isLoadingAudio ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}{" "}
                  </button>{" "}
                  {/* Next track */}{" "}
                  <button type="button" onClick={handleNextTrack} disabled={currentPlaylistTracks.length === 0} className="p-1.5 text-[#D8DCD2] hover:text-[#F4F5F0] transition-colors cursor-pointer disabled:opacity-30" title="Lagu Berikutnya" aria-label="Next Track">
                     {" "}
                     <SkipForward className="w-4 h-4" />{" "}
                  </button>{" "}
                  {/* Repeat / Loop */}{" "}
                  <button type="button" onClick={() => setIsLooping(!isLooping)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isLooping ? "text-[#1DB954]" : "text-[#969A91] hover:text-[#F4F5F0]"}`} title={isLooping ? "Ulang Lagu Aktif" : "Ulang Lagu"} aria-label="Loop Track">
                     {" "}
                     <Repeat className="w-3.5 h-3.5" />{" "}
                  </button>{" "}
               </div>{" "}
               {/* Volume & Mini Status Dock */}{" "}
               <div className="flex items-center justify-between gap-2 px-1">
                  {" "}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#969A91]">
                     {" "}
                     <Sparkles className="w-3 h-3 text-[#1DB954]/80" /> <span>{currentPlaylistTracks.length > 0 ? `${safeIndex + 1}/${currentPlaylistTracks.length}` : "0/0"}</span>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-1.5">
                     {" "}
                     <button type="button" onClick={() => setIsMuted(!isMuted)} className="text-[#969A91] hover:text-[#F4F5F0] transition-colors cursor-pointer" title={isMuted ? "Unmute" : "Mute"} aria-label={isMuted ? "Unmute" : "Mute"}>
                        {" "}
                        {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}{" "}
                     </button>{" "}
                     <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.02}
                        value={isMuted ? 0 : volume}
                        onChange={e => {
                           setVolume(Number(e.target.value));
                           if (isMuted) setIsMuted(false);
                        }}
                        aria-label="Volume slider"
                        className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#1DB954]"
                     />{" "}
                  </div>{" "}
               </div>{" "}
            </div>{" "}
         </section>{" "}
         {/* FULL PLAYLIST & TRACK MANAGER MODAL */}{" "}
         {showManagerModal && (
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" onClick={() => setShowManagerModal(false)}>
               {" "}
               <div className="relative w-full max-w-xl max-h-[85vh] rounded-[24px] bg-[#0E120E] border border-white/10 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-[#F4F5F0]" onClick={e => e.stopPropagation()}>
                  {" "}
                  {/* Modal Header */}{" "}
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                     {" "}
                     <div className="flex items-center gap-2.5">
                        {" "}
                        <div className="w-8 h-8 rounded-xl bg-[#1DB954]/20 border border-[#1DB954]/30 flex items-center justify-center">
                           {" "}
                           <ListMusic className="w-4 h-4 text-[#1DB954]" />{" "}
                        </div>{" "}
                        <div>
                           {" "}
                           <h3 className="text-base font-semibold text-white">Kelola Playlist & Lagu</h3> <p className="text-xs text-white/50">Atur susunan lagu, buat playlist baru, dan hapus lagu bawaan</p>{" "}
                        </div>{" "}
                     </div>{" "}
                     <button type="button" onClick={() => setShowManagerModal(false)} className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors cursor-pointer" aria-label="Tutup">
                        {" "}
                        <X className="w-4 h-4" />{" "}
                     </button>{" "}
                  </div>{" "}
                  {/* Modal Content Scrollable */}{" "}
                  <div className="flex-1 overflow-y-auto weather-scrollbar space-y-5 pr-1 text-sm">
                     {" "}
                     {/* Section 1: Playlists Management */}{" "}
                     <div>
                        {" "}
                        <div className="flex items-center justify-between mb-2">
                           {" "}
                           <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Daftar Playlist Anda</span> <span className="text-[11px] text-white/40">{playlists.length} playlist</span>{" "}
                        </div>{" "}
                        {/* Playlist Tabs / Pills */}{" "}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                           {" "}
                           {playlists.map(pl => {
                              const isActive = pl.id === activePlaylist.id;
                              const isEditing = editingPlaylistId === pl.id;
                              return (
                                 <div key={pl.id} className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${isActive ? "bg-[#1DB954]/15 border-[#1DB954]/50 text-white" : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15]"}`}>
                                    {" "}
                                    <div
                                       className="min-w-0 flex-1 cursor-pointer"
                                       onClick={() => {
                                          setActivePlaylistId(pl.id);
                                          setCurrentTrackIndex(0);
                                       }}>
                                       {" "}
                                       {isEditing ? (
                                          <div className="flex items-center gap-1">
                                             {" "}
                                             <input type="text" value={editingPlaylistName} onChange={e => setEditingPlaylistName(e.target.value)} className="w-full bg-black/60 border border-white/20 rounded px-1.5 py-0.5 text-xs text-white" autoFocus />{" "}
                                             <button type="button" onClick={handleSaveRenamePlaylist} className="p-1 text-[#1DB954] hover:text-white">
                                                {" "}
                                                <Check className="w-3 h-3" />{" "}
                                             </button>{" "}
                                             <button type="button" onClick={() => setEditingPlaylistId(null)} className="p-1 text-white/40 hover:text-white">
                                                {" "}
                                                <X className="w-3 h-3" />{" "}
                                             </button>{" "}
                                          </div>
                                       ) : (
                                          <div>
                                             {" "}
                                             <div className="flex items-center gap-1.5">
                                                {" "}
                                                <span className="font-semibold text-xs truncate">{pl.name}</span> {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />}{" "}
                                             </div>{" "}
                                             <span className="text-[10px] text-white/40">{pl.trackIds.length} lagu</span>{" "}
                                          </div>
                                       )}{" "}
                                    </div>{" "}
                                    {!isEditing && (
                                       <div className="flex items-center gap-1 shrink-0">
                                          {" "}
                                          {/* Rename button */}{" "}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                setEditingPlaylistId(pl.id);
                                                setEditingPlaylistName(pl.name);
                                             }}
                                             className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                                             title="Ganti nama playlist">
                                             {" "}
                                             <Edit2 className="w-3 h-3" />{" "}
                                          </button>{" "}
                                          {/* Delete custom playlist button */}{" "}
                                          {playlists.length > 1 && (
                                             <button type="button" onClick={() => handleDeletePlaylist(pl.id)} className="p-1 text-white/40 hover:text-red-400 transition-colors cursor-pointer" title="Hapus playlist ini">
                                                {" "}
                                                <Trash2 className="w-3 h-3" />{" "}
                                             </button>
                                          )}{" "}
                                       </div>
                                    )}{" "}
                                 </div>
                              );
                           })}{" "}
                        </div>{" "}
                        {/* Create New Playlist Form */}{" "}
                        <div className="flex items-center gap-2">
                           {" "}
                           <input
                              type="text"
                              placeholder="Nama playlist baru (contoh: Santai Sore)"
                              value={newPlaylistName}
                              onChange={e => setNewPlaylistName(e.target.value)}
                              onKeyDown={e => {
                                 if (e.key === "Enter") handleCreatePlaylist();
                              }}
                              className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#1DB954]"
                           />{" "}
                           <button type="button" onClick={handleCreatePlaylist} disabled={!newPlaylistName.trim()} className="px-3 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-40 text-black text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0">
                              {" "}
                              <Plus className="w-3.5 h-3.5" /> <span>Buat Playlist</span>{" "}
                           </button>{" "}
                        </div>{" "}
                     </div>{" "}
                     {/* Section 2: Quick Management for Default Tracks */}{" "}
                     <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {" "}
                        <div>
                           {" "}
                           <h4 className="text-xs font-semibold text-white/90">Lagu Bawaan Sistem</h4> <p className="text-[11px] text-white/50">{hasDefaultTracksRemaining ? "Lagu bawaan masih aktif di daftar putar." : "Semua lagu bawaan sudah dihapus. Hanya lagu Anda yang tampil."}</p>{" "}
                        </div>{" "}
                        <div className="flex items-center gap-2 shrink-0">
                           {" "}
                           {hasDefaultTracksRemaining ? (
                              <button type="button" onClick={handleDeleteAllDefaultTracks} className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer">
                                 {" "}
                                 <Trash2 className="w-3.5 h-3.5" /> <span>Hapus Semua Lagu Bawaan</span>{" "}
                              </button>
                           ) : (
                              <button type="button" onClick={handleRestoreDefaultTracks} className="px-3 py-1.5 rounded-xl bg-[#1DB954]/20 hover:bg-[#1DB954]/30 border border-[#1DB954]/40 text-[#1DB954] text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer">
                                 {" "}
                                 <RotateCcw className="w-3.5 h-3.5" /> <span>Pulihkan Lagu Bawaan</span>{" "}
                              </button>
                           )}{" "}
                        </div>{" "}
                     </div>{" "}
                     {/* Section 3: Tracks in Active Playlist */}{" "}
                     <div>
                        {" "}
                        <div className="flex items-center justify-between mb-2">
                           {" "}
                           <div className="flex items-center gap-2">
                              {" "}
                              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Lagu dalam "{activePlaylist.name}"</span> <span className="px-1.5 py-0.2 rounded bg-white/[0.08] text-[10px] font-mono text-white/60">{currentPlaylistTracks.length} lagu</span>{" "}
                           </div>{" "}
                           <div className="flex items-center gap-1.5">
                              {" "}
                              <button type="button" onClick={() => setShowAddUrlForm(!showAddUrlForm)} className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-white/70 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer transition-colors">
                                 {" "}
                                 <Link2 className="w-3 h-3" /> <span>Tambah Link/URL</span>{" "}
                              </button>{" "}
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-2 py-1 rounded-lg bg-[#1DB954]/20 hover:bg-[#1DB954]/30 border border-[#1DB954]/35 text-[#1DB954] text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors">
                                 {" "}
                                 <Upload className="w-3 h-3" /> <span>Upload File</span>{" "}
                              </button>{" "}
                           </div>{" "}
                        </div>{" "}
                        {/* Add Custom URL Form (if expanded) */}{" "}
                        {showAddUrlForm && (
                           <div className="p-3 mb-3 rounded-xl bg-black/60 border border-white/15 space-y-2 text-xs">
                              {" "}
                              <div className="flex items-center justify-between">
                                 {" "}
                                 <span className="font-semibold text-white/90">Tambah Lagu dari Link Audio</span>{" "}
                                 <button type="button" onClick={() => setShowAddUrlForm(false)} className="text-white/40 hover:text-white">
                                    {" "}
                                    <X className="w-3 h-3" />{" "}
                                 </button>{" "}
                              </div>{" "}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 {" "}
                                 <input type="text" placeholder="Judul Lagu" value={customUrlForm.title} onChange={e => setCustomUrlForm({ ...customUrlForm, title: e.target.value })} className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white" /> <input type="text" placeholder="Nama Artis / Penyanyi" value={customUrlForm.artist} onChange={e => setCustomUrlForm({ ...customUrlForm, artist: e.target.value })} className="bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white" />{" "}
                              </div>{" "}
                              <input type="url" placeholder="URL Audio (contoh: https\://domain.com/lagu.mp3)" value={customUrlForm.url} onChange={e => setCustomUrlForm({ ...customUrlForm, url: e.target.value })} className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white" />{" "}
                              <div className="flex justify-end">
                                 {" "}
                                 <button type="button" onClick={handleAddCustomUrlTrack} disabled={!customUrlForm.title.trim() || !customUrlForm.url.trim()} className="px-3 py-1 rounded-lg bg-[#1DB954] text-black font-semibold text-xs disabled:opacity-40 cursor-pointer">
                                    {" "}
                                    Simpan Lagu ke Playlist{" "}
                                 </button>{" "}
                              </div>{" "}
                           </div>
                        )}{" "}
                        {/* Tracks List */}{" "}
                        <div className="space-y-1.5 max-h-60 overflow-y-auto weather-scrollbar">
                           {" "}
                           {currentPlaylistTracks.length === 0 ? (
                              <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
                                 {" "}
                                 <Music className="w-6 h-6 text-white/20 mx-auto mb-2" /> <p className="text-xs text-white/60">Tidak ada lagu dalam playlist ini</p> <p className="text-[10px] text-white/40 mt-0.5">Klik tombol Upload File atau Tambah Link/URL di atas.</p>{" "}
                              </div>
                           ) : (
                              currentPlaylistTracks.map((track, idx) => {
                                 return (
                                    <div key={track.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors">
                                       {" "}
                                       <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                          {" "}
                                          <span className="font-mono text-xs text-white/40 w-4 text-center">{idx + 1}</span>{" "}
                                          <div className="min-w-0">
                                             {" "}
                                             <div className="flex items-center gap-1.5">
                                                {" "}
                                                <span className="font-medium text-xs text-white truncate">{track.title}</span> {track.isDefault ? <span className="px-1 rounded bg-[#1DB954]/15 text-[#1DB954] text-[9px] font-mono">Bawaan</span> : track.isUploaded ? <span className="px-1 rounded bg-white/[0.08] text-white/60 text-[9px] font-mono">Upload</span> : <span className="px-1 rounded bg-blue-500/20 text-blue-400 text-[9px] font-mono">URL</span>}{" "}
                                             </div>{" "}
                                             <span className="text-[10px] text-white/50 truncate block">{track.artist}</span>{" "}
                                          </div>{" "}
                                       </div>{" "}
                                       <div className="flex items-center gap-1 shrink-0">
                                          {" "}
                                          {/* Move Up */}{" "}
                                          <button type="button" disabled={idx === 0} onClick={e => handleMoveTrack(idx, "up", e)} className="p-1 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer" title="Pindahkan ke atas">
                                             {" "}
                                             <ChevronUp className="w-3.5 h-3.5" />{" "}
                                          </button>{" "}
                                          {/* Move Down */}{" "}
                                          <button type="button" disabled={idx === currentPlaylistTracks.length - 1} onClick={e => handleMoveTrack(idx, "down", e)} className="p-1 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer" title="Pindahkan ke bawah">
                                             {" "}
                                             <ChevronDown className="w-3.5 h-3.5" />{" "}
                                          </button>{" "}
                                          {/* Delete Track */}{" "}
                                          <button type="button" onClick={e => handleDeleteTrack(track.id, e)} className="p-1 text-white/40 hover:text-red-400 transition-colors cursor-pointer ml-1" title={track.isDefault ? "Hapus lagu bawaan ini" : "Hapus lagu ini"}>
                                             {" "}
                                             <Trash2 className="w-3.5 h-3.5" />{" "}
                                          </button>{" "}
                                       </div>{" "}
                                    </div>
                                 );
                              })
                           )}{" "}
                        </div>{" "}
                     </div>{" "}
                  </div>{" "}
                  {/* Modal Footer */}{" "}
                  <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 text-xs">
                     {" "}
                     <span className="text-white/40">Penyimpanan lokal otomatis tersimpan permanen saat refresh.</span>{" "}
                     <button type="button" onClick={() => setShowManagerModal(false)} className="px-4 py-1.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold transition-all cursor-pointer">
                        {" "}
                        Selesai{" "}
                     </button>{" "}
                  </div>{" "}
               </div>{" "}
            </div>
         )}{" "}
      </>
   );
}
