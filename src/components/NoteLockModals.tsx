import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Fingerprint, KeyRound, Lock, LockOpen, ShieldCheck, X } from 'lucide-react';
import { Note, NoteLock } from '../types/todo';
import {
  authenticateWithTouchId,
  BiometricSupportInfo,
  derivePasswordHash,
  detectTouchIdSupport,
  registerWebAuthnTouchId,
  verifyNotePassword,
} from '../utils/noteLockUtils';

interface NoteUnlockModalProps {
  note: Note | null;
  onClose: () => void;
  onUnlocked: (noteId: string) => void;
}

export const NoteUnlockModal: React.FC<NoteUnlockModalProps> = ({
  note,
  onClose,
  onUnlocked,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [touchIdPending, setTouchIdPending] = useState(false);
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<BiometricSupportInfo>({
    available: false,
    mode: 'none',
  });

  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const activeSessionRef = useRef<number>(0);
  const onUnlockedRef = useRef(onUnlocked);
  onUnlockedRef.current = onUnlocked;

  const focusPasswordSoon = () => {
    window.setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 30);
  };

  useEffect(() => {
    if (!note || !note.lock) {
      activeSessionRef.current += 1;
      setTouchIdPending(false);
      return;
    }

    const sessionId = activeSessionRef.current + 1;
    activeSessionRef.current = sessionId;

    const noteId = note.id;
    const noteLock = note.lock;
    const title = note.title.trim() || 'Без названия';

    setPassword('');
    setShowPassword(false);
    setError('');
    setChecking(false);
    setUsePasswordMode(!noteLock.touchIdEnabled);
    setTouchIdPending(Boolean(noteLock.touchIdEnabled));

    let cancelled = false;

    detectTouchIdSupport().then(async (info) => {
      if (cancelled || activeSessionRef.current !== sessionId) return;
      setBiometricInfo(info);

      if (noteLock.touchIdEnabled && info.available) {
        setTouchIdPending(true);
        const res = await authenticateWithTouchId(
          `открыть заметку «${title}»`,
          noteLock.webAuthnCredentialId
        );
        if (cancelled || activeSessionRef.current !== sessionId) return;
        setTouchIdPending(false);
        if (res.ok) {
          onUnlockedRef.current(noteId);
        } else {
          // Fallback seamlessly to password input when Touch ID is canceled or fails
          setUsePasswordMode(true);
          focusPasswordSoon();
        }
      } else {
        setTouchIdPending(false);
        setUsePasswordMode(true);
        focusPasswordSoon();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [note]);

  if (!note || !note.lock) return null;

  const noteTitle = note.title.trim() || 'Без названия';
  const canUseTouchId = Boolean(note.lock.touchIdEnabled);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.lock) return;
    if (!password) {
      setError('Введите пароль');
      passwordInputRef.current?.focus();
      return;
    }
    setChecking(true);
    setError('');
    const ok = await verifyNotePassword(password, note.lock);
    setChecking(false);
    if (ok) {
      onUnlocked(note.id);
    } else {
      setError('Неверный пароль. Попробуйте снова.');
      passwordInputRef.current?.select();
    }
  };

  const handleTouchId = async () => {
    if (!note.lock) return;
    const sessionId = activeSessionRef.current;
    setTouchIdPending(true);
    setUsePasswordMode(false);
    setError('');
    const res = await authenticateWithTouchId(
      `открыть заметку «${noteTitle}»`,
      note.lock.webAuthnCredentialId
    );
    if (activeSessionRef.current !== sessionId) return;
    setTouchIdPending(false);
    if (res.ok) {
      onUnlocked(note.id);
    } else {
      setUsePasswordMode(true);
      if (res.error) setError(res.error);
      focusPasswordSoon();
    }
  };

  const handleSwitchToPassword = () => {
    // Invalidate pending auto Touch ID result if user manually switches to password
    activeSessionRef.current += 1;
    setTouchIdPending(false);
    setUsePasswordMode(true);
    setError('');
    focusPasswordSoon();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-note-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#141D2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="unlock-note-title"
                className="truncate font-display text-base font-semibold text-slate-100"
              >
                {noteTitle}
              </h2>
              <p className="text-xs text-slate-400">Заметка защищена паролем</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {touchIdPending && !usePasswordMode ? (
          <div className="flex flex-col items-center gap-4 px-5 py-7 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/35 bg-blue-500/12 text-blue-400">
              <Fingerprint className="h-7 w-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold text-slate-100">
                Приложите палец к Touch ID
              </p>
              <p className="text-xs text-slate-400">
                Отпечаток запрошен автоматически для быстрого входа
              </p>
            </div>
            <button
              type="button"
              onClick={handleSwitchToPassword}
              className="mt-1 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700/90 bg-[#0D1424] px-4 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
              <span>Ввести пароль</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 px-5 py-5">
            <div>
              <label
                htmlFor="unlock-note-password"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Пароль
              </label>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  id="unlock-note-password"
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Введите пароль от заметки..."
                  className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0D1424] pr-10 pl-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs font-medium text-red-400">{error}</p>}

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="submit"
                disabled={checking}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:opacity-60"
              >
                <LockOpen className="h-4 w-4" />
                <span>{checking ? 'Проверка...' : 'Разблокировать'}</span>
              </button>

              {canUseTouchId && (
                <button
                  type="button"
                  disabled={checking || touchIdPending}
                  onClick={handleTouchId}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-700/90 bg-[#0D1424] px-4 text-sm font-medium text-slate-100 transition-colors hover:border-blue-500/50 hover:bg-slate-800/80 disabled:opacity-60"
                >
                  <Fingerprint className="h-4 w-4 text-blue-400" />
                  <span>Войти по Touch ID</span>
                </button>
              )}

              {canUseTouchId && !biometricInfo.available && (
                <p className="text-center text-[11px] text-slate-500">
                  Нативный Touch ID работает на MacBook в приложении yulist или в Safari / Chrome по HTTPS.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

interface NoteLockSettingsModalProps {
  note: Note | null;
  onClose: () => void;
  onSaveLock: (noteId: string, lock: NoteLock | null) => void;
}

export const NoteLockSettingsModal: React.FC<NoteLockSettingsModalProps> = ({
  note,
  onClose,
  onSaveLock,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touchIdEnabled, setTouchIdEnabled] = useState(true);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [biometricInfo, setBiometricInfo] = useState<BiometricSupportInfo>({
    available: false,
    mode: 'none',
  });

  useEffect(() => {
    if (!note) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTouchIdEnabled(note.lock ? note.lock.touchIdEnabled : true);
    setShowPasswords(false);
    setError('');
    setSaving(false);

    let mounted = true;
    detectTouchIdSupport().then((info) => {
      if (mounted) setBiometricInfo(info);
    });
    return () => {
      mounted = false;
    };
  }, [note]);

  if (!note) return null;

  const isLocked = Boolean(note.lock);
  const noteTitle = note.title.trim() || 'Без названия';

  const handleSetOrUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLocked && note.lock) {
      if (!currentPassword) {
        setError('Введите текущий пароль для изменения настроек');
        return;
      }
      const validCurrent = await verifyNotePassword(currentPassword, note.lock);
      if (!validCurrent) {
        setError('Текущий пароль указан неверно');
        return;
      }
    }

    // If updating existing lock without changing password (only toggling Touch ID)
    if (isLocked && note.lock && !newPassword && !confirmPassword) {
      setSaving(true);
      let webAuthnCredentialId = note.lock.webAuthnCredentialId ?? null;
      if (touchIdEnabled && biometricInfo.mode === 'webauthn' && !webAuthnCredentialId) {
        webAuthnCredentialId = await registerWebAuthnTouchId(note.id, noteTitle);
      }
      onSaveLock(note.id, {
        ...note.lock,
        touchIdEnabled,
        webAuthnCredentialId,
      });
      setSaving(false);
      onClose();
      return;
    }

    if (newPassword.length < 4) {
      setError('Пароль должен содержать минимум 4 символа');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setSaving(true);
    try {
      const { salt, passwordHash } = await derivePasswordHash(newPassword);
      let webAuthnCredentialId: string | null = note.lock?.webAuthnCredentialId ?? null;

      // In browser mode on MacBook, register platform Touch ID credential if enabled
      if (touchIdEnabled && biometricInfo.mode === 'webauthn' && !webAuthnCredentialId) {
        webAuthnCredentialId = await registerWebAuthnTouchId(note.id, noteTitle);
      }

      onSaveLock(note.id, {
        salt,
        passwordHash,
        touchIdEnabled,
        webAuthnCredentialId,
      });
      onClose();
    } catch {
      setError('Не удалось сохранить пароль. Попробуйте снова.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLock = async () => {
    if (!note.lock) return;
    setError('');
    setSaving(true);

    let verified = false;
    if (currentPassword) {
      verified = await verifyNotePassword(currentPassword, note.lock);
      if (!verified) {
        setSaving(false);
        setError('Неверный текущий пароль');
        return;
      }
    } else if (note.lock.touchIdEnabled) {
      const bio = await authenticateWithTouchId(
        `снять пароль с заметки «${noteTitle}»`,
        note.lock.webAuthnCredentialId
      );
      verified = bio.ok;
      if (!verified) {
        setSaving(false);
        setError(bio.error || 'Введите текущий пароль или подтвердите Touch ID');
        return;
      }
    } else {
      setSaving(false);
      setError('Введите текущий пароль, чтобы снять защиту');
      return;
    }

    setSaving(false);
    if (verified) {
      onSaveLock(note.id, null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-settings-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#141D2F] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <h2 id="lock-settings-title" className="font-display text-base font-semibold text-slate-100">
              {isLocked ? 'Защита заметки паролем' : 'Поставить пароль на заметку'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSetOrUpdatePassword} className="space-y-4 px-5 py-4">
          <p className="text-xs leading-relaxed text-slate-400">
            Для заметки <span className="font-semibold text-slate-200">«{noteTitle}»</span> в списке
            будет отображаться только заголовок. При каждом открытии потребуется пароль или Touch ID.
          </p>

          {isLocked && (
            <div>
              <label
                htmlFor="current-note-password"
                className="mb-1.5 block text-xs font-medium text-slate-400"
              >
                Текущий пароль
              </label>
              <input
                id="current-note-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Введите текущий пароль..."
                className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0D1424] px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="new-note-password"
                className="block text-xs font-medium text-slate-400"
              >
                {isLocked ? 'Новый пароль (необязательно)' : 'Придумайте пароль'}
              </label>
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                {showPasswords ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            <input
              id="new-note-password"
              type={showPasswords ? 'text' : 'password'}
              autoFocus={!isLocked}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Минимум 4 символа..."
              className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0D1424] px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-note-password"
              className="mb-1.5 block text-xs font-medium text-slate-400"
            >
              Повторите пароль
            </label>
            <input
              id="confirm-note-password"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="Повторите пароль..."
              className="h-10 w-full rounded-lg border border-slate-700/90 bg-[#0D1424] px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Touch ID toggle */}
          <button
            type="button"
            role="checkbox"
            aria-checked={touchIdEnabled}
            onClick={() => setTouchIdEnabled((v) => !v)}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-800 bg-[#0D1424] p-3 text-left transition-colors hover:border-slate-700"
          >
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                touchIdEnabled
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              {touchIdEnabled && <span className="h-2 w-2 rounded-[1px] bg-white" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <Fingerprint className="h-4 w-4 text-blue-400" />
                <span>Разрешить вход по Touch ID</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Открывать заметку отпечатком пальца на MacBook (нативный Touch ID в приложении и WebAuthn в браузере).
              </p>
            </div>
          </button>

          {error && <p className="text-xs font-medium text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4">
            {isLocked ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleRemoveLock}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/12 disabled:opacity-50"
              >
                <LockOpen className="h-3.5 w-3.5" />
                <span>Снять пароль</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-slate-700/80 px-4 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:opacity-60"
              >
                {saving ? 'Сохранение...' : isLocked ? 'Сохранить' : 'Защитить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
