// A script made to add project dynamically with ease. Only need to add to 'articlesData' for this to work.
document.addEventListener("DOMContentLoaded", function() {
    // Get the section where the articles will be added
    const section = document.querySelector("#main .inner .tiles");

    // Data for the articles
    const articlesData = [
        {
            imageSrc: "assets/img/pic06.jpg",
            title: "WIP1",
            description: "A work-in-progress project to be released soon™",
            link: "projects/Sudoku_JS/Sudoku_JS.html"
        },
        {
            imageSrc: "assets/img/pic05.jpg",
            title: "CMD/Terminal Simulator",
            description: "A simulator for Windows CMD and Ubuntu Terminal command consoles.",
            link: "projects/CMD_Terminal_Simulator/CMD_Terminal_Simulator.html"
        },
        {
            imageSrc: "assets/img/pic04.jpg",
            title: "Many mini-tools",
            description: "A collection of small-scale projects (or tools) that I find interesting to implement or useful for personal need.",
            link: "projects/Many_mini-tools/Many_mini-tools.html"
        },
        {
            imageSrc: "assets/img/pic03.jpg",
            title: "Sudoku Game",
            description: "A Python-based Sudoku game with a built-in solver, featuring a fully implemented GUI using Tkinter.",
            link: "projects/Sudoku_Solver/Sudoku_Solver.html"
        },
        {
            imageSrc: "assets/img/pic02.jpg",
            title: "Web-based Restaurant",
            description: "A web-based online restaurant with user-friendly accounts where users can place orders tied to their account, using MongoDB for order storage and Node.js for server hosting.",
            link: "projects/Web-based_Restaurant/Web-based_Restaurant.html"
        },
        {
            imageSrc: "assets/img/pic01.jpg",
            title: "Store Application",
            description: "A Java-based application with a graphical user interface (GUI) that enables users to add or remove items from their shopping cart.",
            link: "projects/Store_Application/Store_Application.html"
        }
    ];

    // Loop through the data to create multiple articles
    articlesData.forEach(data => {
        // Create the article element
        const article = document.createElement("article");
        article.className = "style1";

        // Create the span with the image
        const span = document.createElement("span");
        span.className = "image";

        const img = document.createElement("img");
        img.src = data.imageSrc;
        img.alt = "";
        span.appendChild(img);

        // Create the anchor tag
        const anchor = document.createElement("a");
        anchor.href = data.link;

        // Create the h2 element for the title
        const h2 = document.createElement("h2");
        h2.textContent = data.title;

        // Create the div with the paragraph for the description
        const contentDiv = document.createElement("div");
        contentDiv.className = "content";

        const paragraph = document.createElement("p");
        paragraph.textContent = data.description;
        contentDiv.appendChild(paragraph);

        // Append everything together
        anchor.appendChild(h2);
        anchor.appendChild(contentDiv);
        article.appendChild(span);
        article.appendChild(anchor);

        // Append the article to the section
        section.appendChild(article);
    });
});

// Disable right-click for the container
document.getElementById('cmd-body').addEventListener('contextmenu', function(e) {
    e.preventDefault(); // Prevent the context menu from appearing
});

window.onbeforeunload = function() {
    localStorage.setItem("scrollPosition", window.scrollY);
};

// Restore scroll position on page load
window.onload = function() {
    const scrollPosition = localStorage.getItem("scrollPosition");
    if (scrollPosition) {
        window.scrollTo(0, 0);
    }
};
