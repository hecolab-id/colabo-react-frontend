"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarClock, CheckCircle2, ChevronDown, ListChecks, Lock } from "lucide-react";
import { getPublicProject, type PublicProject, type PublicProjectTask } from "@/lib/api";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "active" | "inactive" | "error";

const dayFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function formatDay(value: string | null): string {
    if (!value) return "";
    return dayFormatter.format(new Date(value));
}

function timeAgo(value: string): string {
    const then = new Date(value).getTime();
    const diff = Date.now() - then;
    if (Number.isNaN(then)) return "";
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(then);
}

export default function PublicProgressPage() {
    const params = useParams<{ token: string }>();
    const token = params.token ?? "";
    const [state, setState] = useState<LoadState>("loading");
    const [project, setProject] = useState<PublicProject | null>(null);

    useEffect(() => {
        if (!token) {
            setState("inactive");
            return;
        }
        let alive = true;
        setState("loading");
        getPublicProject(token)
            .then((data) => {
                if (!alive) return;
                setProject(data);
                setState("active");
            })
            .catch((error: unknown) => {
                if (!alive) return;
                const status =
                    typeof error === "object" && error !== null && "response" in error
                        ? (error as { response?: { status?: number } }).response?.status
                        : undefined;
                setState(status === 404 || status === 410 ? "inactive" : "error");
            });
        return () => {
            alive = false;
        };
    }, [token]);

    useEffect(() => {
        if (project) document.title = `${project.name} · Progress`;
    }, [project]);

    if (state === "loading") return <ShareScaffold><ShareSkeleton /></ShareScaffold>;
    if (state === "inactive") return <ShareScaffold><ShareNotice icon={<Lock className="h-6 w-6" aria-hidden="true" />} title="This link is no longer active" body="The project owner has turned off public access or replaced the link. Reach out to them for an updated one." /></ShareScaffold>;
    if (state === "error" || !project) {
        return (
            <ShareScaffold>
                <ShareNotice
                    title="Couldn't load this page"
                    body="Something went wrong fetching the project. Please try again."
                    action={
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                        >
                            Retry
                        </button>
                    }
                />
            </ShareScaffold>
        );
    }

    return <ShareScaffold><ShareContent project={project} /></ShareScaffold>;
}

function ShareScaffold({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-[100dvh] flex-col bg-[#f4f7fb] text-slate-900">
            <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
                <div className="mx-auto flex w-full max-w-[110rem] items-center justify-between px-5 py-3.5 sm:px-8">
                    <Wordmark />
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        Read-only
                    </span>
                </div>
            </header>
            <main className="mx-auto w-full max-w-[110rem] flex-1 px-5 py-8 sm:px-8 sm:py-12">{children}</main>
            <BrandFooter />
        </div>
    );
}

function Wordmark() {
    return (
        <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-primary text-[13px] font-bold text-primary-foreground">c</span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">colabo</span>
        </div>
    );
}

function BrandFooter() {
    return (
        <footer className="border-t border-slate-200/70 py-6">
            <div className="mx-auto flex w-full max-w-[110rem] flex-col items-center gap-1 px-5 text-center sm:px-8">
                <p className="text-xs text-slate-400">
                    Powered by <span className="font-semibold text-slate-500">Colabo</span>
                </p>
                <a href="/" className="text-xs font-medium text-primary transition-colors hover:text-primary/80">
                    Run your own project hub
                </a>
            </div>
        </footer>
    );
}

function ShareContent({ project }: { project: PublicProject }) {
    const columns = useMemo(() => [...project.columns].sort((a, b) => a.order - b.order), [project.columns]);
    const grouped = useMemo(() => {
        const byColumn = new Map<string, PublicProjectTask[]>();
        for (const column of columns) byColumn.set(column.id, []);
        const orphans: PublicProjectTask[] = [];
        for (const task of project.tasks) {
            const bucket = byColumn.get(task.column_id);
            if (bucket) bucket.push(task);
            else orphans.push(task);
        }
        return { byColumn, orphans };
    }, [columns, project.tasks]);

    const { summary } = project;

    return (
        <div className="space-y-8">
            <section>
                {project.team_name ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{project.team_name}</p>
                ) : null}
                <h1 className="mt-1.5 text-[28px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[34px]">{project.name}</h1>
                {project.description ? (
                    <p className="mt-2 max-w-2xl whitespace-pre-wrap text-[15px] leading-7 text-slate-600">{project.description}</p>
                ) : null}
                <p className="mt-3 text-[13px] text-slate-400">Updated {timeAgo(project.updated_at)}</p>
            </section>

            <ProgressSummary summary={summary} />

            {project.tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center">
                    <p className="text-[15px] font-semibold text-slate-900">No tasks yet</p>
                    <p className="mt-1 text-sm text-slate-500">This project hasn't been planned out yet. Check back soon.</p>
                </div>
            ) : (
                <section className="flex flex-col gap-6 lg:flex-row lg:gap-5 lg:overflow-x-auto lg:pb-2">
                    {columns.map((column) => {
                        const tasks = grouped.byColumn.get(column.id) ?? [];
                        if (tasks.length === 0) return null;
                        return <BoardColumn key={column.id} name={column.name} color={column.color} tasks={tasks} />;
                    })}
                    {grouped.orphans.length > 0 ? (
                        <BoardColumn name="Other" color="#94a3b8" tasks={grouped.orphans} />
                    ) : null}
                </section>
            )}
        </div>
    );
}

function ProgressSummary({ summary }: { summary: PublicProject["summary"] }) {
    const stats: Array<{ label: string; value: number; dot: string; emphasize?: boolean }> = [
        { label: "Done", value: summary.done, dot: "bg-emerald-500" },
        { label: "In progress", value: summary.in_progress, dot: "bg-primary" },
        { label: "To do", value: summary.todo, dot: "bg-slate-300" },
        { label: "Overdue", value: summary.overdue, dot: "bg-rose-500", emphasize: summary.overdue > 0 },
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-500">Overall progress</p>
                    <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                        {summary.percent_complete}
                        <span className="text-lg font-semibold text-slate-400">%</span>
                    </p>
                </div>
                <p className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">{summary.done}</span> of {summary.total} tasks complete
                </p>
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, summary.percent_complete))}%` }}
                />
            </div>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                {stats.map((stat) => (
                    <div key={stat.label} className="inline-flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", stat.dot)} aria-hidden="true" />
                        <span className="text-sm text-slate-500">{stat.label}</span>
                        <span className={cn("text-sm font-semibold tabular-nums", stat.emphasize ? "text-rose-600" : "text-slate-900")}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function BoardColumn({ name, color, tasks }: { name: string; color: string; tasks: PublicProjectTask[] }) {
    return (
        <div className="lg:w-[19rem] lg:shrink-0">
            <div className="mb-3 flex items-center gap-2 px-0.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">{name}</h3>
                <span className="text-[12px] font-medium tabular-nums text-slate-400">{tasks.length}</span>
            </div>
            <div className="space-y-2.5">
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}
            </div>
        </div>
    );
}

function TaskCard({ task }: { task: PublicProjectTask }) {
    const [open, setOpen] = useState(false);
    const overdue = !task.is_done && !!task.due_date && new Date(task.due_date).getTime() < Date.now();
    const descriptionHtml = useMemo(
        () => (open && task.description ? sanitizeRichText(task.description) : ""),
        [open, task.description],
    );
    const hasMeta = !!task.due_date || !!task.checklist || !!task.assignee;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex items-start gap-2">
                {task.is_done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : null}
                <h4 className={cn("text-sm font-medium leading-5", task.is_done ? "text-slate-400 line-through" : "text-slate-900")}>
                    {task.title}
                </h4>
            </div>

            {task.labels.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {task.labels.map((label, index) => (
                        <span
                            key={`${label.name}-${index}`}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} aria-hidden="true" />
                            {label.name}
                        </span>
                    ))}
                </div>
            ) : null}

            {hasMeta ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {task.due_date ? (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 text-xs font-medium",
                                overdue ? "text-rose-600" : "text-slate-500",
                            )}
                        >
                            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                            {task.start_date ? `${formatDay(task.start_date)} – ${formatDay(task.due_date)}` : formatDay(task.due_date)}
                        </span>
                    ) : null}
                    {task.checklist ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                            {task.checklist.done}/{task.checklist.total}
                        </span>
                    ) : null}
                    {task.assignee ? (
                        <span className="ml-auto inline-flex items-center gap-1.5">
                            <Avatar user={{ name: task.assignee.first_name, avatar_url: task.assignee.avatar_url }} size="xs" />
                            <span className="text-xs font-medium text-slate-600">{task.assignee.first_name}</span>
                        </span>
                    ) : null}
                </div>
            ) : null}

            {task.description ? (
                <div className="mt-2.5 border-t border-slate-100 pt-2">
                    <button
                        type="button"
                        onClick={() => setOpen((value) => !value)}
                        aria-expanded={open}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        Details
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
                    </button>
                    {open ? (
                        <div
                            className="prose prose-sm mt-2 max-w-none text-[13px] leading-6 text-slate-600 prose-a:text-primary prose-headings:text-slate-800"
                            // eslint-disable-next-line react/no-danger
                            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function ShareSkeleton() {
    return (
        <div className="animate-pulse space-y-8">
            <div className="space-y-3">
                <div className="h-3 w-28 rounded bg-slate-200" />
                <div className="h-8 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-100" />
            </div>
            <div className="h-28 rounded-2xl border border-slate-200 bg-white" />
            <div className="flex gap-5">
                {[0, 1, 2].map((index) => (
                    <div key={index} className="hidden flex-1 space-y-2.5 lg:block">
                        <div className="h-4 w-24 rounded bg-slate-200" />
                        <div className="h-20 rounded-2xl border border-slate-200 bg-white" />
                        <div className="h-20 rounded-2xl border border-slate-200 bg-white" />
                    </div>
                ))}
                <div className="h-20 w-full rounded-2xl border border-slate-200 bg-white lg:hidden" />
            </div>
        </div>
    );
}

function ShareNotice({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
    return (
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {icon ? (
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">{icon}</span>
            ) : null}
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{body}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}
