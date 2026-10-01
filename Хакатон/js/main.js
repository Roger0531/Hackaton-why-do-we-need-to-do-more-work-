 // Підсвічує тему, яка зараз відкрита
        const currentPage = location.pathname.split("/").pop() || "index.html";
        document.querySelectorAll("#topicList a").forEach(link => {
            if (link.getAttribute("href") === currentPage) {
                link.classList.add("active");
                link.setAttribute("aria-current", "page");
                link.scrollIntoView({ block: "center" });
            }
        });
 
        // Пошук по темах
        const search = document.getElementById("topicSearch");
        const noResults = document.getElementById("noResults");
        search.addEventListener("input", () => {
            const query = search.value.trim().toLowerCase();
            let shown = 0;
            document.querySelectorAll("#topicList li").forEach(item => {
                const match = item.textContent.toLowerCase().includes(query);
                item.classList.toggle("d-none", !match);
                if (match) shown++;
            });
            noResults.classList.toggle("d-none", shown > 0);
        });