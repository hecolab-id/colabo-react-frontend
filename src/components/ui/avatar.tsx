import { cva, type VariantProps } from "class-variance-authority";
import Image from "@/components/app-image";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold leading-none",
    {
        variants: {
            size: {
                xs: "h-6 w-6 text-[9px]",
                sm: "h-7 w-7 text-[10px]",
                md: "h-9 w-9 text-xs",
                lg: "h-[52px] w-[52px] text-[15px]",
                xl: "h-16 w-16 text-lg",
            },
            tone: {
                ink: "bg-primary-dark text-white",
                tint: "bg-[var(--accent)] text-[var(--primary)]",
            },
            ringed: {
                true: "ring-2 ring-white",
                false: "",
            },
        },
        defaultVariants: {
            size: "md",
            tone: "ink",
            ringed: false,
        },
    },
);

const sizeToPx: Record<NonNullable<VariantProps<typeof avatarVariants>["size"]>, number> = {
    xs: 24,
    sm: 28,
    md: 36,
    lg: 52,
    xl: 64,
};

export function getInitials(name: string | null | undefined): string {
    if (!name) return "?";
    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
    return initials || "?";
}

interface AvatarUser {
    name?: string | null;
    avatar_url?: string | null;
}

interface AvatarProps extends VariantProps<typeof avatarVariants> {
    user: AvatarUser;
    className?: string;
    alt?: string;
}

export function Avatar({ user, size = "md", tone = "ink", ringed = false, className, alt }: AvatarProps) {
    const name = user.name ?? "";
    const altText = alt ?? name;
    const px = sizeToPx[size ?? "md"];

    if (user.avatar_url) {
        return (
            <span className={cn(avatarVariants({ size, tone, ringed }), className)}>
                <Image
                    src={user.avatar_url}
                    alt={altText}
                    width={px}
                    height={px}
                    className="h-full w-full object-cover"
                />
            </span>
        );
    }

    return (
        <span aria-label={altText || undefined} className={cn(avatarVariants({ size, tone, ringed }), className)}>
            {getInitials(name)}
        </span>
    );
}
