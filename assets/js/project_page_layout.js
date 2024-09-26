const buttons = document.querySelectorAll('.expand-collapse-button');
buttons.forEach(button => {
    let toggle = true;

    button.addEventListener('click', function() {
        if (toggle) {
            button.textContent = '▲';
        } else {
            button.textContent = '▼';
        }
        toggle = !toggle;
    });
});

function toggleContent(contentId) {
    const content = document.getElementById(contentId);
    content.classList.toggle('active');
    if (content.style.maxHeight){
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}