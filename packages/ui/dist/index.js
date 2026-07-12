import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useId, useRef, useState, } from "react";
const cx = (...classes) => classes.filter(Boolean).join(" ");
export const Button = forwardRef(function Button({ className, variant = "primary", size = "medium", fullWidth = false, type = "button", ...props }, ref) {
    return (_jsx("button", { ref: ref, className: cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`, fullWidth && "ui-button--full", className), type: type, ...props }));
});
export const IconButton = forwardRef(function IconButton({ className, label, type = "button", ...props }, ref) {
    return (_jsx("button", { ref: ref, "aria-label": label, className: cx("ui-icon-button", className), type: type, ...props }));
});
function FieldShell({ id: suppliedId, label, hint, error, children, }) {
    const generatedId = useId();
    const id = suppliedId ?? generatedId;
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (_jsxs("label", { className: "ui-field", htmlFor: id, children: [_jsx("span", { className: "ui-field__label", children: label }), children(id, describedBy), error ? (_jsx("span", { className: "ui-field__error", id: `${id}-error`, children: error })) : null, !error && hint ? (_jsx("span", { className: "ui-field__hint", id: `${id}-hint`, children: hint })) : null] }));
}
export const Input = forwardRef(function Input({ id, label, hint, error, className, ...props }, ref) {
    return (_jsx(FieldShell, { ...(id ? { id } : {}), label: label, ...(hint ? { hint } : {}), ...(error ? { error } : {}), children: (fieldId, describedBy) => (_jsx("input", { ref: ref, "aria-describedby": describedBy, "aria-invalid": Boolean(error), className: cx("ui-control", className), id: fieldId, ...props })) }));
});
export const Textarea = forwardRef(function Textarea({ id, label, hint, error, className, ...props }, ref) {
    return (_jsx(FieldShell, { ...(id ? { id } : {}), label: label, ...(hint ? { hint } : {}), ...(error ? { error } : {}), children: (fieldId, describedBy) => (_jsx("textarea", { ref: ref, "aria-describedby": describedBy, "aria-invalid": Boolean(error), className: cx("ui-control ui-control--textarea", className), id: fieldId, ...props })) }));
});
export const Select = forwardRef(function Select({ id, label, hint, error, className, children, ...props }, ref) {
    return (_jsx(FieldShell, { ...(id ? { id } : {}), label: label, ...(hint ? { hint } : {}), ...(error ? { error } : {}), children: (fieldId, describedBy) => (_jsx("select", { ref: ref, "aria-describedby": describedBy, "aria-invalid": Boolean(error), className: cx("ui-control ui-control--select", className), id: fieldId, ...props, children: children })) }));
});
export function Dialog({ open, title, description, children, actions, onClose, closeLabel = "Close dialog", tone = "default", }) {
    const dialogRef = useRef(null);
    const previousFocusRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog)
            return;
        if (open && !dialog.open) {
            previousFocusRef.current =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;
            dialog.showModal();
        }
        if (!open && dialog.open) {
            dialog.close();
            previousFocusRef.current?.focus();
            previousFocusRef.current = null;
        }
    }, [open]);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog)
            return;
        const handleCancel = (event) => {
            event.preventDefault();
            onClose();
        };
        dialog.addEventListener("cancel", handleCancel);
        return () => dialog.removeEventListener("cancel", handleCancel);
    }, [onClose]);
    return (_jsx("dialog", { ref: dialogRef, "aria-describedby": description ? descriptionId : undefined, "aria-labelledby": titleId, className: cx("ui-dialog", tone === "danger" && "ui-dialog--danger"), onClose: () => {
            if (open)
                onClose();
        }, children: _jsxs("div", { className: "ui-dialog__surface", children: [_jsx(IconButton, { className: "ui-dialog__close", label: closeLabel, onClick: onClose, children: "\u00D7" }), _jsxs("div", { className: "ui-dialog__heading", children: [_jsx("p", { className: "ui-kicker", children: tone === "danger" ? "PLEASE CONFIRM" : "PARAMINGLE" }), _jsx("h2", { id: titleId, children: title }), description ? _jsx("p", { id: descriptionId, children: description }) : null] }), _jsx("div", { className: "ui-dialog__body", children: children }), actions ? _jsx("div", { className: "ui-dialog__actions", children: actions }) : null] }) }));
}
export function AlertDialog(props) {
    return _jsx(Dialog, { ...props, tone: "danger" });
}
export function ToastRegion({ message, tone = "neutral", className, ...props }) {
    return (_jsx("div", { "aria-atomic": "true", "aria-live": "polite", className: cx("ui-toast-region", className), role: "status", ...props, children: message ? (_jsx("div", { className: cx("ui-toast", `ui-toast--${tone}`), children: message })) : null }));
}
export function Avatar({ name, src, size = "medium", status }) {
    const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "?";
    return (_jsxs("span", { className: cx("ui-avatar", `ui-avatar--${size}`), children: [src ? (_jsx("img", { alt: name, src: src })) : (_jsx("span", { "aria-label": name, children: initials })), status ? (_jsx("i", { "aria-label": status, className: `ui-avatar__status ui-avatar__status--${status}` })) : null] }));
}
export function Badge({ tone = "neutral", className, ...props }) {
    return (_jsx("span", { className: cx("ui-badge", `ui-badge--${tone}`, className), ...props }));
}
export function Card({ as: Component = "article", className, ...props }) {
    return _jsx(Component, { className: cx("ui-card", className), ...props });
}
export function Tabs({ label, items, value, onValueChange }) {
    const [internalValue, setInternalValue] = useState(items[0]?.value ?? "");
    const activeValue = value ?? internalValue;
    const active = items.find((item) => item.value === activeValue) ?? items[0];
    const select = (next) => {
        if (value === undefined)
            setInternalValue(next);
        onValueChange?.(next);
    };
    return (_jsxs("div", { className: "ui-tabs", children: [_jsx("div", { "aria-label": label, className: "ui-tabs__list", role: "tablist", children: items.map((item) => (_jsx("button", { "aria-controls": `panel-${item.value}`, "aria-selected": item.value === active?.value, id: `tab-${item.value}`, onClick: () => select(item.value), role: "tab", tabIndex: item.value === active?.value ? 0 : -1, type: "button", children: item.label }, item.value))) }), active ? (_jsx("div", { "aria-labelledby": `tab-${active.value}`, className: "ui-tabs__panel", id: `panel-${active.value}`, role: "tabpanel", children: active.panel })) : null] }));
}
export function Skeleton({ className, width = "100%", height = "1rem", style, ...props }) {
    return (_jsx("span", { "aria-hidden": "true", className: cx("ui-skeleton", className), style: { width, height, ...style }, ...props }));
}
export function AppFrame({ productName = "PARAMINGLE", environmentLabel, navigation, mobileNavigation, headerActions, children, }) {
    return (_jsxs("div", { className: "ui-app-frame", children: [_jsx("a", { className: "ui-skip-link", href: "#main-content", children: "Skip to content" }), _jsxs("header", { className: "ui-app-header", children: [_jsxs("a", { className: "ui-wordmark", href: "/", children: [productName, _jsx("i", { children: "." })] }), environmentLabel ? _jsx(Badge, { children: environmentLabel }) : null, _jsx("div", { className: "ui-app-header__actions", children: headerActions })] }), _jsx("aside", { className: "ui-sidebar", children: navigation }), _jsx("main", { className: "ui-app-main", id: "main-content", tabIndex: -1, children: children }), _jsx("nav", { "aria-label": "Mobile navigation", className: "ui-mobile-nav", children: mobileNavigation })] }));
}
