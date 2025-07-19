import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ActivityLogItem, EventSeverity } from "@/lib/admin/dashboard";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ActivityLogProps {
  logs: ActivityLogItem[];
  title: string;
  description: string;
}

function getSeverityVariant(
  severity: EventSeverity
): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "INFO":
      return "default";
    case "WARNING":
      return "secondary";
    case "ERROR":
      return "destructive";
    case "CRITICAL":
      return "destructive";
    default:
      return "outline";
  }
}

function getSeverityColor(severity: EventSeverity): string {
  switch (severity) {
    case "INFO":
      return "text-blue-600";
    case "WARNING":
      return "text-orange-600";
    case "ERROR":
      return "text-red-600";
    case "CRITICAL":
      return "text-red-800";
    default:
      return "text-gray-600";
  }
}

export function ActivityLog({ logs, title, description }: ActivityLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Niveau</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge
                      variant={getSeverityVariant(log.severity)}
                      className={getSeverityColor(log.severity)}
                    >
                      {log.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.description}</TableCell>
                  <TableCell>{log.user_email}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(log.timestamp), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune activité récente à afficher.</p>
        )}
      </CardContent>
    </Card>
  );
}
