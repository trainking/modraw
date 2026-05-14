import { useState } from 'react'
import { useT } from '../i18n'
import { useAppStore } from '../stores/app'

export function AccountModePanel() {
  const authMode = useAppStore((s) => s.authMode)
  const user = useAppStore((s) => s.user)
  const login = useAppStore((s) => s.login)
  const logout = useAppStore((s) => s.logout)
  const [loginOpen, setLoginOpen] = useState(false)
  const [email, setEmail] = useState('')
  const t = useT()
  const isCloudMode = authMode === 'cloud'

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    login(email)
    setEmail('')
    setLoginOpen(false)
  }

  const handleLogout = () => {
    logout()
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
          <div className="mt-2 text-[11px] leading-4 text-[var(--color-text-muted)]">{t('loginHint')}</div>
          <button className="btn-primary mt-3 w-full text-xs py-2" type="submit">
            {t('login')}
          </button>
        </form>
      )}
    </div>
  )
}
