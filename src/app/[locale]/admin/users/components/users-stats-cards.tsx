"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Shield, Edit, User, TrendingUp, Clock } from "lucide-react";
import { type UserStats } from "@/actions/userActions";

interface UsersStatsCardsProps {
  stats: UserStats;
  isLoading?: boolean;
}

export function UsersStatsCards({ stats, isLoading }: UsersStatsCardsProps) {
  if (isLoading) {
    return <StatsCardsSkeleton />;
  }

  // Provide default stats if stats is null/undefined
  const safeStats = stats || {
    total: 0,
    active: 0,
    suspended: 0,
    admins: 0,
    editors: 0,
    users: 0,
    newThisWeek: 0,
    activeToday: 0,
  };

  const statsConfig = [
    {
      title: "Total utilisateurs",
      value: safeStats.total,
      icon: Users,
      description: "Tous les comptes",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Actifs",
      value: safeStats.active,
      icon: UserCheck,
      description: "Comptes actifs",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Suspendus",
      value: safeStats.suspended,
      icon: UserX,
      description: "Comptes suspendus",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Administrateurs",
      value: safeStats.admins,
      icon: Shield,
      description: "Rôle admin",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Éditeurs",
      value: safeStats.editors,
      icon: Edit,
      description: "Rôle éditeur",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Utilisateurs",
      value: safeStats.users,
      icon: User,
      description: "Rôle standard",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
    {
      title: "Nouveaux (7j)",
      value: safeStats.newThisWeek,
      icon: TrendingUp,
      description: "Cette semaine",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Actifs (24h)",
      value: safeStats.activeToday,
      icon: Clock,
      description: "Dernières 24h",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ];

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsConfig.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-md p-2 ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stat.value || 0).toLocaleString()}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function StatsCardsSkeleton() {
  return (
    <section className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="mb-1 h-8 w-12 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
