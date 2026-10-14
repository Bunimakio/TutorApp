import type { Component } from 'vue';
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  Home,
  Lock,
  LogOut,
  Mail,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  UserPlus,
} from 'lucide-vue-next';

/**
 * Registro de íconos para poder pasar componentes por nombre desde los props
 * (`icon="Plus"`). Un `<component :is="'Plus'">` con un string NO resuelve el
 * componente de lucide y no dibuja nada (deja solo el hueco del layout).
 */
const iconRegistry: Record<string, Component> = {
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  Home,
  Lock,
  LogOut,
  Mail,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  UserPlus,
};

export function resolveIcon(name?: string | Component | null): Component | undefined {
  if (!name) return undefined;
  if (typeof name !== 'string') return name;
  return iconRegistry[name];
}
