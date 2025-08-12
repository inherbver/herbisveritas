import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PartnerShop {
  name: string;
  description: string;
  address: string;
  imageUrl: string;
  facebookUrl: string | null;
}

interface PartnerShopCardProps {
  partner: PartnerShop;
}

export function PartnerShopCard({ partner }: PartnerShopCardProps) {
  const { name, description, address, imageUrl, facebookUrl } = partner;

  return (
    <article aria-labelledby={`partner-${name.replace(/\s+/g, "-")}`}>
      <Card className="flex h-full flex-col overflow-hidden shadow-md transition-shadow duration-300 hover:shadow-lg">
        <div className="relative h-full min-h-[350px] w-full">
          <Image
            src={imageUrl}
            alt={`Image de ${name}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
        <CardHeader>
          <CardTitle id={`partner-${name.replace(/\s+/g, "-")}`}>{name}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <address className="text-sm not-italic text-muted-foreground">{address}</address>
        </CardContent>
        {facebookUrl && (
          <CardFooter>
            <Button asChild className="w-full">
              <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
                <Facebook className="mr-2 h-5 w-5" />
                Découvrir sur Facebook
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </article>
  );
}
