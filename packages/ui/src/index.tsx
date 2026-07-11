import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'medium', fullWidth = false, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cx(
        'ui-button',
        `ui-button--${variant}`,
        `ui-button--${size}`,
        fullWidth && 'ui-button--full',
        className,
      )}
      type={type}
      {...props}
    />
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, label, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      className={cx('ui-icon-button', className)}
      type={type}
      {...props}
    />
  )
})

interface FieldShellProps {
  id?: string
  label: string
  hint?: string
  error?: string
  children: (id: string, describedBy?: string) => ReactNode
}

function FieldShell({ id: suppliedId, label, hint, error, children }: FieldShellProps) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <label className="ui-field" htmlFor={id}>
      <span className="ui-field__label">{label}</span>
      {children(id, describedBy)}
      {error ? (
        <span className="ui-field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span className="ui-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
    </label>
  )
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string
  label: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, className, ...props },
  ref,
) {
  return (
    <FieldShell
      {...(id ? { id } : {})}
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      {(fieldId, describedBy) => (
        <input
          ref={ref}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cx('ui-control', className)}
          id={fieldId}
          {...props}
        />
      )}
    </FieldShell>
  )
})

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id?: string
  label: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, hint, error, className, ...props },
  ref,
) {
  return (
    <FieldShell
      {...(id ? { id } : {})}
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      {(fieldId, describedBy) => (
        <textarea
          ref={ref}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cx('ui-control ui-control--textarea', className)}
          id={fieldId}
          {...props}
        />
      )}
    </FieldShell>
  )
})

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id?: string
  label: string
  hint?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id, label, hint, error, className, children, ...props },
  ref,
) {
  return (
    <FieldShell
      {...(id ? { id } : {})}
      label={label}
      {...(hint ? { hint } : {})}
      {...(error ? { error } : {})}
    >
      {(fieldId, describedBy) => (
        <select
          ref={ref}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={cx('ui-control ui-control--select', className)}
          id={fieldId}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldShell>
  )
})

export interface DialogProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  onClose: () => void
  closeLabel?: string
  tone?: 'default' | 'danger'
}

export function Dialog({
  open,
  title,
  description,
  children,
  actions,
  onClose,
  closeLabel = 'Close dialog',
  tone = 'default',
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    }
    if (!open && dialog.open) {
      dialog.close()
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={cx('ui-dialog', tone === 'danger' && 'ui-dialog--danger')}
      onClose={() => {
        if (open) onClose()
      }}
    >
      <div className="ui-dialog__surface">
        <IconButton className="ui-dialog__close" label={closeLabel} onClick={onClose}>
          ×
        </IconButton>
        <div className="ui-dialog__heading">
          <p className="ui-kicker">{tone === 'danger' ? 'PLEASE CONFIRM' : 'STRANGR'}</p>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <div className="ui-dialog__body">{children}</div>
        {actions ? <div className="ui-dialog__actions">{actions}</div> : null}
      </div>
    </dialog>
  )
}

export type AlertDialogProps = Omit<DialogProps, 'tone'>

export function AlertDialog(props: AlertDialogProps) {
  return <Dialog {...props} tone="danger" />
}

export interface ToastRegionProps extends HTMLAttributes<HTMLDivElement> {
  message?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

export function ToastRegion({ message, tone = 'neutral', className, ...props }: ToastRegionProps) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={cx('ui-toast-region', className)}
      role="status"
      {...props}
    >
      {message ? <div className={cx('ui-toast', `ui-toast--${tone}`)}>{message}</div> : null}
    </div>
  )
}

export interface AvatarProps {
  name: string
  src?: string
  size?: 'small' | 'medium' | 'large'
  status?: 'online' | 'offline'
}

export function Avatar({ name, src, size = 'medium', status }: AvatarProps) {
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  return (
    <span className={cx('ui-avatar', `ui-avatar--${size}`)}>
      {src ? <img alt={name} src={src} /> : <span aria-label={name}>{initials}</span>}
      {status ? (
        <i aria-label={status} className={`ui-avatar__status ui-avatar__status--${status}`} />
      ) : null}
    </span>
  )
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cx('ui-badge', `ui-badge--${tone}`, className)} {...props} />
}

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'div'
}

export function Card({ as: Component = 'article', className, ...props }: CardProps) {
  return <Component className={cx('ui-card', className)} {...props} />
}

export interface TabItem {
  value: string
  label: string
  panel: ReactNode
}

export interface TabsProps {
  label: string
  items: TabItem[]
  value?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ label, items, value, onValueChange }: TabsProps) {
  const [internalValue, setInternalValue] = useState(items[0]?.value ?? '')
  const activeValue = value ?? internalValue
  const active = items.find((item) => item.value === activeValue) ?? items[0]

  const select = (next: string) => {
    if (value === undefined) setInternalValue(next)
    onValueChange?.(next)
  }

  return (
    <div className="ui-tabs">
      <div aria-label={label} className="ui-tabs__list" role="tablist">
        {items.map((item) => (
          <button
            aria-controls={`panel-${item.value}`}
            aria-selected={item.value === active?.value}
            id={`tab-${item.value}`}
            key={item.value}
            onClick={() => select(item.value)}
            role="tab"
            tabIndex={item.value === active?.value ? 0 : -1}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {active ? (
        <div
          aria-labelledby={`tab-${active.value}`}
          className="ui-tabs__panel"
          id={`panel-${active.value}`}
          role="tabpanel"
        >
          {active.panel}
        </div>
      ) : null}
    </div>
  )
}

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  width?: string
  height?: string
}

export function Skeleton({
  className,
  width = '100%',
  height = '1rem',
  style,
  ...props
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cx('ui-skeleton', className)}
      style={{ width, height, ...style }}
      {...props}
    />
  )
}

export interface AppFrameProps {
  productName?: string
  environmentLabel?: string
  navigation: ReactNode
  mobileNavigation: ReactNode
  headerActions?: ReactNode
  children: ReactNode
}

export function AppFrame({
  productName = 'STRANGR',
  environmentLabel,
  navigation,
  mobileNavigation,
  headerActions,
  children,
}: AppFrameProps) {
  return (
    <div className="ui-app-frame">
      <a className="ui-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="ui-app-header">
        <a className="ui-wordmark" href="/">
          {productName}
          <i>.</i>
        </a>
        {environmentLabel ? <Badge>{environmentLabel}</Badge> : null}
        <div className="ui-app-header__actions">{headerActions}</div>
      </header>
      <aside className="ui-sidebar">{navigation}</aside>
      <main className="ui-app-main" id="main-content" tabIndex={-1}>
        {children}
      </main>
      <nav aria-label="Mobile navigation" className="ui-mobile-nav">
        {mobileNavigation}
      </nav>
    </div>
  )
}
