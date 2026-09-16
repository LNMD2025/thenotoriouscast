(() => {
  const copyButton = document.querySelector("[data-copy-rss]");
  const rssInput = document.querySelector("[data-rss]");
  if (copyButton instanceof HTMLButtonElement && rssInput instanceof HTMLInputElement) {
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(rssInput.value);
        copyButton.textContent = "Copied";
        window.setTimeout(() => {
          copyButton.textContent = "Copy";
        }, 1600);
      } catch {
        rssInput.select();
        document.execCommand("copy");
      }
    });
  }

  const players = document.querySelectorAll("[data-player]");
  for (const root of players) {
    const audio = root.querySelector("audio");
    const buttons = [...root.querySelectorAll("[data-start]")];
    if (!(audio instanceof HTMLAudioElement)) continue;

    const activate = (seconds) => {
      for (const button of buttons) {
        const start = Number(button.getAttribute("data-start") || "0");
        const next = buttons.find((candidate) => Number(candidate.getAttribute("data-start") || "0") > start);
        const end = next ? Number(next.getAttribute("data-start") || "0") : Number.POSITIVE_INFINITY;
        button.classList.toggle("is-active", seconds >= start && seconds < end);
      }
    };

    for (const button of buttons) {
      button.addEventListener("click", () => {
        const start = Number(button.getAttribute("data-start") || "0");
        audio.currentTime = start;
        void audio.play();
        activate(start);
      });
    }

    audio.addEventListener("timeupdate", () => activate(audio.currentTime));
  }
})();
