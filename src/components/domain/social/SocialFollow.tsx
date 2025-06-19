import { Facebook, Instagram } from "lucide-react";

const socialLinks = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/HerbisVeritas", // TODO: Remplacer par le lien réel
    icon: Facebook,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/herbisveritas", // TODO: Remplacer par le lien réel
    icon: Instagram,
  },
];

export function SocialFollow() {
  return (
    <div className="flex items-center justify-center gap-4">
      {socialLinks.map((social) => (
        <a
          key={social.name}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Suivez-nous sur ${social.name}`}
          className="hover:bg-primary/10 focus:ring-primary/50 group block rounded-full bg-background p-3 shadow-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <social.icon className="h-6 w-6 text-foreground transition-colors group-hover:text-primary" />
          <span className="sr-only">{social.name}</span>
        </a>
      ))}
    </div>
  );
}
