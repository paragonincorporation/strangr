import { type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: "small" | "medium" | "large";
    fullWidth?: boolean;
}
export declare const Button: import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
}
export declare const IconButton: import("react").ForwardRefExoticComponent<IconButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
    id?: string;
    label: string;
    hint?: string;
    error?: string;
}
export declare const Input: import("react").ForwardRefExoticComponent<InputProps & import("react").RefAttributes<HTMLInputElement>>;
export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
    id?: string;
    label: string;
    hint?: string;
    error?: string;
}
export declare const Textarea: import("react").ForwardRefExoticComponent<TextareaProps & import("react").RefAttributes<HTMLTextAreaElement>>;
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
    id?: string;
    label: string;
    hint?: string;
    error?: string;
}
export declare const Select: import("react").ForwardRefExoticComponent<SelectProps & import("react").RefAttributes<HTMLSelectElement>>;
export interface DialogProps {
    open: boolean;
    title: string;
    description?: string;
    children: ReactNode;
    actions?: ReactNode;
    onClose: () => void;
    closeLabel?: string;
    tone?: "default" | "danger";
}
export declare function Dialog({ open, title, description, children, actions, onClose, closeLabel, tone, }: DialogProps): import("react").JSX.Element;
export type AlertDialogProps = Omit<DialogProps, "tone">;
export declare function AlertDialog(props: AlertDialogProps): import("react").JSX.Element;
export interface ToastRegionProps extends HTMLAttributes<HTMLDivElement> {
    message?: string;
    tone?: "neutral" | "success" | "warning" | "danger";
}
export declare function ToastRegion({ message, tone, className, ...props }: ToastRegionProps): import("react").JSX.Element;
export interface AvatarProps {
    name: string;
    src?: string;
    size?: "small" | "medium" | "large";
    status?: "online" | "offline";
}
export declare function Avatar({ name, src, size, status }: AvatarProps): import("react").JSX.Element;
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}
export declare function Badge({ tone, className, ...props }: BadgeProps): import("react").JSX.Element;
export interface CardProps extends HTMLAttributes<HTMLElement> {
    as?: "article" | "section" | "div";
}
export declare function Card({ as: Component, className, ...props }: CardProps): import("react").JSX.Element;
export interface TabItem {
    value: string;
    label: string;
    panel: ReactNode;
}
export interface TabsProps {
    label: string;
    items: TabItem[];
    value?: string;
    onValueChange?: (value: string) => void;
}
export declare function Tabs({ label, items, value, onValueChange }: TabsProps): import("react").JSX.Element;
export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
    width?: string;
    height?: string;
}
export declare function Skeleton({ className, width, height, style, ...props }: SkeletonProps): import("react").JSX.Element;
export interface AppFrameProps {
    productName?: string;
    environmentLabel?: string;
    navigation: ReactNode;
    mobileNavigation: ReactNode;
    headerActions?: ReactNode;
    children: ReactNode;
}
export declare function AppFrame({ productName, environmentLabel, navigation, mobileNavigation, headerActions, children, }: AppFrameProps): import("react").JSX.Element;
export {};
