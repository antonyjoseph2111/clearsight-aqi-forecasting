// Professional Policy Webpage - Interactive Features

document.addEventListener('DOMContentLoaded', function () {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.navbar a');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Highlight active navigation link on scroll
    window.addEventListener('scroll', function () {
        let current = '';
        const sections = document.querySelectorAll('.section');

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.pageYOffset >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });

    // Add animation to cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';

                setTimeout(() => {
                    entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll('.card, .policy-card');
    cards.forEach(card => {
        observer.observe(card);
    });

    // Add search/filter functionality for policies
    const createSearchBox = () => {
        const policiesSection = document.querySelector('#policies');
        if (policiesSection) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            searchContainer.innerHTML = `
                <input type="text" id="policySearch" placeholder="Search policies by keyword, ministry, or year..." />
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="central">Central</button>
                    <button class="filter-btn" data-filter="regional">Regional</button>
                    <button class="filter-btn" data-filter="state">State</button>
                </div>
            `;

            const firstH2 = policiesSection.querySelector('h2');
            firstH2.after(searchContainer);

            // Search functionality
            const searchInput = document.getElementById('policySearch');
            searchInput.addEventListener('input', filterPolicies);

            // Filter buttons
            const filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(btn => {
                btn.addEventListener('click', function () {
                    filterButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    filterPolicies();
                });
            });
        }
    };

    const filterPolicies = () => {
        const searchTerm = document.getElementById('policySearch').value.toLowerCase();
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        const policyCards = document.querySelectorAll('.policy-card');

        policyCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matchesSearch = text.includes(searchTerm);
            const matchesFilter = activeFilter === 'all' || card.classList.contains(activeFilter);

            if (matchesSearch && matchesFilter) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    };

    // Add print functionality
    const addPrintButton = () => {
        const header = document.querySelector('header .container');
        const printBtn = document.createElement('button');
        printBtn.className = 'print-btn';
        printBtn.innerHTML = '🖨️ Print Report';
        printBtn.onclick = () => window.print();
        header.appendChild(printBtn);
    };

    // Add statistics counter animation
    const animateCounters = () => {
        const counters = document.querySelectorAll('.impact-table td');
        counters.forEach(counter => {
            const text = counter.textContent;
            if (text.includes('%') || text.includes('µg/m³')) {
                counter.style.fontWeight = '600';
            }
        });
    };

    // Initialize features
    createSearchBox();
    addPrintButton();
    animateCounters();

    // Add back-to-top button
    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.innerHTML = '↑';
    backToTop.onclick = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };
    document.body.appendChild(backToTop);

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTop.style.display = 'block';
        } else {
            backToTop.style.display = 'none';
        }
    });

    console.log('Delhi-NCR Air Quality Policy Framework loaded successfully');
});
