import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActivityLogItem } from "@/lib/admin/dashboard";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ActivityLogProps {
  logs: ActivityLogItem[];
  title: string;
  description: string;
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
                <TableHead>Description</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
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
