import { X } from 'lucide-react'
import { useUiStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'

function SettingRow({
  label,
  value,
  unit,
  children,
}: {
  label: string
  value: string
  unit?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm text-paper">{label}</label>
        <span className="font-mono text-xs text-ink-muted">
          {value}
          {unit}
        </span>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPanel() {
  const isOpen = useUiStore((s) => s.isSettingsOpen)
  const setOpen = useUiStore((s) => s.setSettingsOpen)
  const settings = useSettingsStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="h-full w-full max-w-sm overflow-y-auto border-l border-ink-3 bg-ink-2 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg text-paper">Settings</h2>
          <button onClick={() => setOpen(false)} aria-label="Close settings" className="rounded-full p-1.5 hover:bg-ink-3">
            <X size={18} />
          </button>
        </div>

        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Focus overlay</h3>
        <SettingRow label="Overlay darkness" value={String(Math.round(settings.overlayOpacity * 100))} unit="%">
          <input
            type="range"
            min={0.3}
            max={0.97}
            step={0.01}
            value={settings.overlayOpacity}
            onChange={(e) => settings.update({ overlayOpacity: Number(e.target.value) })}
            className="w-full accent-lamp"
          />
        </SettingRow>

        <SettingRow label="Sentence highlight padding" value={String(settings.highlightPadding)} unit="px">
          <input
            type="range"
            min={0}
            max={32}
            step={1}
            value={settings.highlightPadding}
            onChange={(e) => settings.update({ highlightPadding: Number(e.target.value) })}
            className="w-full accent-lamp"
          />
        </SettingRow>

        <label className="mb-6 flex items-center justify-between text-sm text-paper">
          Auto-center current sentence
          <input
            type="checkbox"
            checked={settings.autoCenterSentence}
            onChange={(e) => settings.update({ autoCenterSentence: e.target.checked })}
            className="h-4 w-4 accent-lamp"
          />
        </label>

        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Scan mode window</h3>
        <SettingRow
          label="Window height"
          value={String(Math.round(settings.scanWindowHeightPct * 100))}
          unit="% of page"
        >
          <input
            type="range"
            min={0.08}
            max={0.5}
            step={0.01}
            value={settings.scanWindowHeightPct}
            onChange={(e) => settings.update({ scanWindowHeightPct: Number(e.target.value) })}
            className="w-full accent-lamp"
          />
        </SettingRow>

        <SettingRow
          label="Step size"
          value={String(Math.round(settings.scanWindowStepPct * 100))}
          unit="% of window"
        >
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.scanWindowStepPct}
            onChange={(e) => settings.update({ scanWindowStepPct: Number(e.target.value) })}
            className="w-full accent-lamp"
          />
        </SettingRow>

        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Navigation</h3>
        <div className="rounded-lg border border-ink-3 bg-ink/40 p-3 text-xs text-ink-muted">
          Browsers don't let web pages intercept hardware volume buttons, so FocusPDF maps the same
          actions to your <span className="font-mono text-paper">↑</span> /{' '}
          <span className="font-mono text-paper">↓</span> arrow keys instead — previous/next sentence in
          text mode, move the window in scan mode. <span className="font-mono text-paper">←</span> /{' '}
          <span className="font-mono text-paper">→</span> change pages.
        </div>

        <button
          onClick={() => settings.reset()}
          className="mt-6 w-full rounded-full border border-ink-3 py-2 text-sm text-ink-muted hover:border-ink-border hover:text-paper"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
