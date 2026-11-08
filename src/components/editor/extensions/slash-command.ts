import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { getSlashCommands, type SlashItem } from "./slash-items";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }: { editor: any; range: any; props: SlashItem }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: true,
        command: ({ editor, range, props }: { editor: any; range: any; props: SlashItem }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          const all = getSlashCommands();
          if (!query) return all;
          const q = query.toLowerCase().trim();
          return all.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.category.toLowerCase().includes(q) ||
              item.aliases?.some((a) => a.toLowerCase().includes(q))
          );
        },
        render: () => {
          let componentEl: HTMLDivElement | null = null;
          let selectedIndex = 0;
          let currentProps: any = null;

          const updateSelection = () => {
            if (!componentEl) return;
            const buttons = componentEl.querySelectorAll("[data-command-item]");
            buttons.forEach((btn, idx) => {
              if (idx === selectedIndex) {
                btn.classList.add("bg-[#A85D44]/15", "text-[#A85D44]", "dark:text-[#C4785E]", "border-[#A85D44]/30");
                btn.scrollIntoView({ block: "nearest" });
              } else {
                btn.classList.remove("bg-[#A85D44]/15", "text-[#A85D44]", "dark:text-[#C4785E]", "border-[#A85D44]/30");
              }
            });
          };

          const positionMenu = (props: any) => {
            const coords = props.clientRect?.();
            if (coords && componentEl) {
              const top = coords.bottom + 8;
              const left = Math.max(16, Math.min(coords.left, window.innerWidth - 300));
              componentEl.style.top = `${top}px`;
              componentEl.style.left = `${left}px`;
            }
          };

          const renderItems = (props: any) => {
            currentProps = props;
            if (!componentEl) {
              componentEl = document.createElement("div");
              componentEl.className =
                "tiptap-slash-menu fixed z-[120] w-72 max-h-80 overflow-y-auto rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/95 dark:bg-[#21201E]/95 p-2 shadow-2xl backdrop-blur-xl transition-all";
              document.body.appendChild(componentEl);
            }

            if (!props.items.length) {
              componentEl.innerHTML = `
                <div class="px-4 py-3 text-xs text-[#757069] text-center font-medium">
                  No matching commands
                </div>
              `;
              positionMenu(props);
              return;
            }

            componentEl.innerHTML = "";
            props.items.forEach((item: SlashItem, index: number) => {
              const btn = document.createElement("button");
              btn.type = "button";
              btn.setAttribute("data-command-item", "true");
              btn.className = `flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-xs transition-colors hover:bg-[#EFEBE3] dark:hover:bg-[#292825] ${
                index === selectedIndex
                  ? "bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] border-[#A85D44]/30"
                  : "text-[#2D2926] dark:text-[#E3DFD7]"
              }`;

              btn.innerHTML = `
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] font-mono text-xs font-semibold text-[#A85D44] dark:text-[#C4785E]">
                  ${item.icon}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate text-[#2D2926] dark:text-[#E3DFD7]">${item.title}</div>
                  <div class="text-[11px] text-[#757069] dark:text-[#948F86] truncate">${item.description}</div>
                </div>
              `;

              btn.addEventListener("mousedown", (e) => {
                e.preventDefault();
                props.command(item);
              });

              btn.addEventListener("mouseenter", () => {
                selectedIndex = index;
                updateSelection();
              });

              componentEl!.appendChild(btn);
            });

            updateSelection();
            positionMenu(props);
          };

          return {
            onStart: (props: any) => {
              selectedIndex = 0;
              renderItems(props);
            },
            onUpdate: (props: any) => {
              renderItems(props);
            },
            onKeyDown: (props: any) => {
              if (props.event.key === "ArrowUp") {
                props.event.preventDefault();
                if (currentProps?.items?.length) {
                  selectedIndex =
                    (selectedIndex + currentProps.items.length - 1) % currentProps.items.length;
                  updateSelection();
                }
                return true;
              }
              if (props.event.key === "ArrowDown") {
                props.event.preventDefault();
                if (currentProps?.items?.length) {
                  selectedIndex = (selectedIndex + 1) % currentProps.items.length;
                  updateSelection();
                }
                return true;
              }
              if (props.event.key === "Enter") {
                props.event.preventDefault();
                props.event.stopPropagation();
                const item = currentProps?.items?.[selectedIndex];
                if (item) {
                  currentProps.command(item);
                  return true;
                }
                return false;
              }
              if (props.event.key === "Escape") {
                props.event.preventDefault();
                if (componentEl) {
                  componentEl.remove();
                  componentEl = null;
                }
                return true;
              }
              return false;
            },
            onExit: () => {
              if (componentEl) {
                componentEl.remove();
                componentEl = null;
              }
            },
          };
        },
      }),
    ];
  },
});

