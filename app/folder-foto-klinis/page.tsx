'use client';

import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ApiError } from '@/lib/api-client';
import { photoTemplateGroupsApi, type PhotoTemplateGroup } from '@/lib/clinical-photos';
import { useToast } from '@/lib/toast-context';
import '../styles/folder-foto-klinis.css';

/**
 * Pengaturan folder & template foto klinis (PRD: Template Foto Pasien &
 * Manajemen Konten). Folder bawaan sistem ("Behel") hanya bisa
 * diaktif/nonaktifkan dari sini; folder buatan klinik bebas diubah.
 */
export default function FolderFotoKlinisPage() {
  const { success, error } = useToast();
  const [groups, setGroups] = useState<PhotoTemplateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newSlotName, setNewSlotName] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setGroups(await photoTemplateGroupsApi.list(false));
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal memuat folder foto klinis');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      setCreatingGroup(true);
      await photoTemplateGroupsApi.create(newGroupName.trim());
      setNewGroupName('');
      success('Folder dibuat');
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal membuat folder');
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleGroupActive = async (group: PhotoTemplateGroup) => {
    try {
      setBusy(true);
      await photoTemplateGroupsApi.update(group.id, { isActive: !group.isActive });
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengubah folder');
    } finally {
      setBusy(false);
    }
  };

  const renameGroup = async (group: PhotoTemplateGroup, name: string) => {
    if (group.clinicId === null || !name.trim() || name === group.name) return;
    try {
      await photoTemplateGroupsApi.update(group.id, { name: name.trim() });
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengubah nama folder');
    }
  };

  const handleCreateSlot = async (groupId: number) => {
    const name = newSlotName[groupId]?.trim();
    if (!name) return;
    try {
      setBusy(true);
      await photoTemplateGroupsApi.createTemplate(groupId, name);
      setNewSlotName((prev) => ({ ...prev, [groupId]: '' }));
      success('Slot ditambahkan');
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal menambah slot');
    } finally {
      setBusy(false);
    }
  };

  const toggleSlotActive = async (templateId: number, isActive: boolean) => {
    try {
      setBusy(true);
      await photoTemplateGroupsApi.updateTemplate(templateId, { isActive });
      await load();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Gagal mengubah slot');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="content">
        <div className="page-header">
          <div>
            <h1>Folder &amp; Template Foto Klinis</h1>
            <p className="page-subtitle">
              Folder bawaan sistem (&ldquo;Behel&rdquo;) hanya bisa diaktif/nonaktifkan; folder buatan klinik ini bebas diubah.
            </p>
          </div>
        </div>

        <div className="ffk-new-group">
          <input
            type="text"
            placeholder="Nama folder baru, mis. Bedah Minor"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            disabled={creatingGroup}
          />
          <button type="button" className="btn-primary" onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()}>
            <span aria-hidden="true" className="material-symbols-rounded">create_new_folder</span>
            Buat Folder
          </button>
        </div>

        {loading ? (
          <div className="rx-empty">Memuat…</div>
        ) : (
          <div className="ffk-groups">
            {groups.map((group) => (
              <div key={group.id} className={`ffk-group-card${group.isActive ? '' : ' ffk-inactive'}`}>
                <div className="ffk-group-head">
                  {group.clinicId === null ? (
                    <h2>
                      {group.name} <span className="ffk-badge-default">Bawaan sistem</span>
                    </h2>
                  ) : (
                    <input
                      type="text"
                      defaultValue={group.name}
                      className="ffk-group-name-input"
                      onBlur={(e) => renameGroup(group, e.target.value)}
                    />
                  )}
                  <label className="ffk-toggle">
                    <input
                      type="checkbox"
                      checked={group.isActive}
                      disabled={busy}
                      onChange={() => toggleGroupActive(group)}
                    />
                    Aktif
                  </label>
                </div>

                <ul className="ffk-slot-list">
                  {group.templates.map((t) => (
                    <li key={t.id} className={t.isActive ? '' : 'ffk-inactive'}>
                      <span>{t.name}</span>
                      <label className="ffk-toggle">
                        <input
                          type="checkbox"
                          checked={t.isActive}
                          disabled={busy}
                          onChange={() => toggleSlotActive(t.id, !t.isActive)}
                        />
                        Aktif
                      </label>
                    </li>
                  ))}
                </ul>

                {group.clinicId !== null && (
                  <div className="ffk-new-slot">
                    <input
                      type="text"
                      placeholder="Nama slot baru, mis. Pre-op"
                      value={newSlotName[group.id] ?? ''}
                      onChange={(e) => setNewSlotName((prev) => ({ ...prev, [group.id]: e.target.value }))}
                    />
                    <button type="button" className="btn-outline" onClick={() => handleCreateSlot(group.id)} disabled={busy}>
                      Tambah Slot
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </DashboardLayout>
  );
}
