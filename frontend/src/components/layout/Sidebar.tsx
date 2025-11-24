'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import {
  Home,
  Calendar,
  Users,
  CreditCard,
  User,
  Settings,
  XCircle,
  LogOut,
  Stethoscope,
  Shield,
  Package,
  FileText,
  Activity,
  Heart,
} from 'lucide-react';

// Menu do Administrador
const adminMenuItems = [
  { icon: Home, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Package, label: 'Planos', href: '/admin/planos' },
  { icon: Users, label: 'Assinantes', href: '/admin/assinantes' },
  { icon: FileText, label: 'Logs de Erro', href: '/admin/logs' },
  { icon: Activity, label: 'Relatórios', href: '/admin/relatorios' },
];

// Menu do Assinante (titular do plano)
const subscriberMenuItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  {
    icon: Calendar,
    label: 'Consultas',
    href: '/consultas',
    subItems: [
      { label: 'Agendar', href: '/consultas/agendar' },
      { label: 'Agendamentos', href: '/consultas/agendamentos' },
      { label: 'Histórico', href: '/consultas/historico' },
      { label: 'Clínico Geral', href: '/consultas/imediato' },
      { label: 'Encaminhamentos', href: '/consultas/encaminhamentos' },
    ],
  },
  { icon: Users, label: 'Dependentes', href: '/dependentes' },
  { icon: CreditCard, label: 'Faturas', href: '/faturas' },
  { icon: User, label: 'Meus Dados', href: '/meus-dados' },
  { icon: XCircle, label: 'Cancelar Plano', href: '/cancelar-plano', danger: true },
];

// Menu do Dependente (apenas serviços médicos)
const dependentMenuItems = [
  { icon: Home, label: 'Dashboard', href: '/dependente/dashboard' },
  {
    icon: Calendar,
    label: 'Consultas',
    href: '/consultas',
    subItems: [
      { label: 'Agendar', href: '/consultas/agendar' },
      { label: 'Agendamentos', href: '/consultas/agendamentos' },
      { label: 'Histórico', href: '/consultas/historico' },
      { label: 'Clínico Geral', href: '/consultas/imediato' },
      { label: 'Encaminhamentos', href: '/consultas/encaminhamentos' },
    ],
  },
  { icon: User, label: 'Meus Dados', href: '/meus-dados' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('subscriber');
  const [userName, setUserName] = useState<string>('Usuário');
  const [userEmail, setUserEmail] = useState<string>('usuario@example.com');

  // Detectar o tipo de usuário do localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role || 'subscriber');
      setUserName(user.name || 'Usuário');
      setUserEmail(user.email || 'usuario@example.com');
    }
  }, []);

  // Selecionar o menu baseado no tipo de usuário
  const menuItems = 
    userRole === 'admin' ? adminMenuItems :
    userRole === 'dependent' ? dependentMenuItems :
    subscriberMenuItems;

  // Ícone e cor do perfil baseado no tipo de usuário
  const profileConfig = {
    admin: { icon: Shield, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600', badge: 'Administrador' },
    subscriber: { icon: CreditCard, color: 'bg-primary/10 text-primary', badge: 'Assinante' },
    dependent: { icon: Heart, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600', badge: 'Dependente' },
  };

  const currentProfile = profileConfig[userRole as keyof typeof profileConfig] || profileConfig.subscriber;
  const ProfileIcon = currentProfile.icon;

  const handleLogout = () => {
    // Limpar dados do localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Fechar sidebar (mobile)
    onClose();
    
    // Redirecionar para página inicial
    router.push('/');
  };

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-full w-64 bg-white dark:bg-surface-dark border-r border-border-light dark:border-border-dark',
          'transform transition-transform duration-300 ease-in-out z-50',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border-light dark:border-border-dark">
          <img
            src="/logo.png"
            alt="Médicos Consultas Online"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center space-x-3">
            <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center', currentProfile.color)}>
              <ProfileIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentProfile.badge}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-xl transition-all duration-200',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    isActive && 'bg-primary/10 text-primary border-l-4 border-primary',
                    !isActive && 'text-gray-700 dark:text-gray-300',
                    item.danger && 'text-danger hover:bg-danger/10'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </Link>

                {/* Sub-items */}
                {item.subItems && isActive && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.subItems.map((subItem: any) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={onClose}
                        className={clsx(
                          'block px-4 py-2 rounded-lg text-sm transition-colors',
                          pathname === subItem.href
                            ? 'text-primary font-medium bg-primary/5'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
