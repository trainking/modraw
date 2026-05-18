import { useState } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../stores/app'
import { useSceneStore } from '../stores/scene'

export function AccountModePanel() {
  const authMode = useAppStore((s) => s.authMode)
  const user = useAppStore((s) => s.user)
  const login = useAppStore((s) => s.login)
  const register = useAppStore((s) => s.register)
  const logout = useAppStore((s) => s.logout)
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerMode, setRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const t = useT()
  const isCloudMode = authMode === 'cloud'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (registerMode) {
        await register(email, password, nickname)
      } else {
        await login(email, password)
      }
      await useSceneStore.getState().loadCloudFiles()
      setEmail('')
      setPassword('')
      setNickname('')
      setLoginOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cloudLoginFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    useSceneStore.getState().loadLocalFiles()
    setLoginOpen(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-[120] w-[min(320px,calc(100vw-32px))] island px-3 py-3 pointer-events-auto select-none">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isCloudMode ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-text-dim)]'}`} />
            <span className="text-sm font-semibold text-[var(--color-text)]">
              {isCloudMode ? t('cloudMode') : t('localMode')}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
            {user?.email || (isCloudMode ? t('cloudModeDescription') : t('localModeDescription'))}
          </div>
        </div>
        {user ? (
          <button onClick={handleLogout} className="btn-ghost shrink-0 text-xs px-3 py-1.5">
            {t('logout')}
          </button>
        ) : (
          <button onClick={() => setLoginOpen((value) => !value)} className="btn-primary shrink-0 text-xs px-3 py-1.5">
            {t('login')}
          </button>
        )}
      </div>

      {loginOpen && !user && (
        <form onSubmit={handleLogin} className="mt-3 border-t border-[var(--color-border-light)] pt-3">
          <div className="mb-2 text-xs font-semibold text-[var(--color-text)]">{t('loginTitle')}</div>
          <input
            className="input-field w-full"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('loginEmailPlaceholder')}
            autoFocus
            required
          />
          <input
            className="input-field mt-2 w-full"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('loginPasswordPlaceholder')}
            required
            minLength={8}
          />
          {registerMode && (
            <input
              className="input-field mt-2 w-full"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('nicknamePlaceholder')}
            />
          )}
          {error && <div className="mt-2 text-[11px] leading-4 text-[var(--color-danger)]">{error}</div>}
          <button className="btn-primary mt-3 w-full text-xs py-2" type="submit" disabled={busy}>
            {busy ? t('cloudWorking') : registerMode ? t('register') : t('login')}
          </button>
          <button
            className="btn-ghost mt-2 w-full text-xs py-2"
            type="button"
            onClick={() => {
              setRegisterMode((value) => !value)
              setError('')
            }}
          >
            {registerMode ? t('useLogin') : t('createAccount')}
          </button>
        </form>
      )}
    </div>
  )
}
