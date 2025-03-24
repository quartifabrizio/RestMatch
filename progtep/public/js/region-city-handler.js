// Questo file dovrebbe essere salvato in progtep/public/js/region-city-handler.js

document.addEventListener('DOMContentLoaded', function() {
    const regionSelect = document.getElementById('region');
    const citySelect = document.getElementById('city');
    
    if (regionSelect && citySelect) {
        // Carica le regioni dal server
        fetch('/api/regions')
            .then(response => response.json())
            .then(regions => {
                populateRegions(regions);
                
                // Se c'è una regione già selezionata, carica le relative città
                if (regionSelect.value) {
                    updateCitiesForRegion(regionSelect.value);
                }
            })
            .catch(error => console.error('Errore nel caricamento delle regioni:', error));
        
        // Aggiungi event listener per aggiornare le città quando cambia la regione
        regionSelect.addEventListener('change', function() {
            updateCitiesForRegion(this.value);
        });
    }
    
    function populateRegions(regions) {
        // Salva la selezione corrente se presente
        const currentSelection = regionSelect.value;
        
        // Pulisci le opzioni esistenti eccetto la prima (se è un placeholder)
        const placeholder = regionSelect.querySelector('option[value=""]');
        regionSelect.innerHTML = '';
        if (placeholder) {
            regionSelect.appendChild(placeholder);
        }
        
        // Aggiungi tutte le regioni
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionSelect.appendChild(option);
        });
        
        // Ripristina la selezione se esiste nelle nuove opzioni
        if (currentSelection) {
            regionSelect.value = currentSelection;
        }
    }
    
    function updateCitiesForRegion(region) {
        if (!region) {
            citySelect.innerHTML = '<option value="">Seleziona prima una regione</option>';
            citySelect.disabled = true;
            return;
        }
        
        // Carica le città per la regione selezionata
        fetch(`/api/cities/${encodeURIComponent(region)}`)
            .then(response => response.json())
            .then(cities => {
                // Salva la selezione corrente
                const currentSelection = citySelect.value;
                
                // Pulisci le opzioni esistenti
                citySelect.innerHTML = '';
                
                // Aggiungi l'opzione placeholder
                const placeholder = document.createElement('option');
                placeholder.value = "";
                placeholder.textContent = "Seleziona una città";
                citySelect.appendChild(placeholder);
                
                // Aggiungi le città della regione selezionata
                cities.forEach(city => {
                    const option = document.createElement('option');
                    option.value = city;
                    option.textContent = city;
                    citySelect.appendChild(option);
                });
                
                // Abilita il select delle città
                citySelect.disabled = false;
                
                // Ripristina la selezione se esiste nelle nuove opzioni
                if (currentSelection && cities.includes(currentSelection)) {
                    citySelect.value = currentSelection;
                } else {
                    citySelect.selectedIndex = 0;
                }
            })
            .catch(error => console.error('Errore nel caricamento delle città:', error));
    }
});