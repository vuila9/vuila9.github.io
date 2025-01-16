// A script made to add project dynamically with ease. Only need to add to 'articlesData' for this to work.
document.addEventListener("DOMContentLoaded", function() {
    // Get the section where the articles will be added
    const section = document.querySelector("#main .inner .tiles");

    // Data for the articles
    const articlesData = [
        // {
        //     imageSrc: "assets/img/pic08.jpg",
        //     title: "W.I.P",
        //     description: "A work-in-progress project to be released soon™",
        //     link: "projects/Project_name/Project_name.html"
        // },
        {
            imageSrc: "assets/img/program_icons/stream_simulator_tile.jpg",
            title: "Stream Simulator",
            description: "A work-in-progress project to be released soon™",
            link: "projects/Stream_Simulator/Stream_Simulator.html"
        },
        {
            imageSrc: "assets/img/program_icons/snake_tile.jpg",
            title: "Snake Game",
            description: "Snake game made using HTML, CSS, JS",
            link: "projects/Snake/Snake.html"
        },
        {
            imageSrc: "assets/img/program_icons/paint_tile.jpg",
            title: "Paint",
            description: "A paint program that allows users to draw.",
            link: "projects/MS_Paint/MS_Paint.html"
        },
        {
            imageSrc: "assets/img/program_icons/cube_tile.jpg",
            title: "Cube",
            description: "A program featuring a 3D object created using Three.js and Blender.",
            link: "projects/Cube/Cube.html"
        },
        {
            imageSrc: "assets/img/program_icons/terminal_tile.jpg",
            title: "Terminal Simulator",
            description: "A simulator for Windows CMD and Ubuntu Terminal command consoles.",
            link: "projects/CMD_Terminal_Simulator/CMD_Terminal_Simulator.html"
        },
        {
            imageSrc: "assets/img/program_icons/manytools_tile.jpg",
            title: "Many mini-tools",
            description: "A collection of small-scale projects (or tools) that I find interesting to implement or useful for personal need.",
            link: "projects/Many_mini-tools/Many_mini-tools.html"
        },
        {
            imageSrc: "assets/img/program_icons/sudoku_tile.jpg",
            title: "Sudoku Game (v2)",
            description: "A Sudoku game with built-in solver, featuring a fully implemented GUI using JavaScript, HTML, and CSS.",
            link: "projects/Sudoku_JS/Sudoku_JS.html"
        },
        // {
        //     imageSrc: "assets/img/pic03.jpg",
        //     title: "Sudoku Game",
        //     description: "A Python-based Sudoku game with a built-in solver, featuring a fully implemented GUI using Tkinter.",
        //     link: "projects/Sudoku_Solver/Sudoku_Solver.html"
        // },
        {
            imageSrc: "assets/img/program_icons/restaurant_tile.jpg",
            title: "Web-based Restaurant",
            description: "A web-based online restaurant using MongoDB for storing order database and Node.js for server hosting.",
            link: "projects/Web-based_Restaurant/Web-based_Restaurant.html"
        },
        {
            imageSrc: "assets/img/program_icons/storeapp_tile.jpg",
            title: "Store Application",
            description: "A Java-based application with a graphical user interface (GUI).",
            link: "projects/Store_Application/Store_Application.html"
        }
    ];

    // Loop through the data to create multiple articles
    articlesData.forEach(data => {
        const tile_size = '225px';

        // Create the article element
        const article = document.createElement("article");
        article.style.width = tile_size;
        article.style.height = tile_size;
        //article.className = "style8";

        // Create the span with the image
        const span = document.createElement("span");
        span.className = "image";
        span.style.width = tile_size;
        span.style.height = tile_size;
        //span.style.overflow = 'hidden';

        const img = document.createElement("img");
        img.src = data.imageSrc;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'fill';
        span.appendChild(img);

        // Create the anchor tag
        const anchor = document.createElement("a");
        anchor.href = data.link;

        // Create the h2 element for the title
        const h2 = document.createElement("h2");
        h2.className = 'program_title';
        h2.textContent = data.title;

        // Create the div with the paragraph for the description
        const contentDiv = document.createElement("div");
        contentDiv.className = "content";

        const paragraph = document.createElement("p");
        paragraph.textContent = data.description;
        contentDiv.appendChild(h2);
        contentDiv.appendChild(paragraph);

        // Append everything together
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
