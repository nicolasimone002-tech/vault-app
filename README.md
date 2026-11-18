# Vault PWA v0.2 — prototipo sperimentale

## Funzioni
- Archivio cifrato locale con Web Crypto AES-256-GCM e PBKDF2-SHA256 (600.000 iterazioni).
- Password principale, creazione/modifica/eliminazione/ricerca credenziali, generatore casuale.
- Service worker per uso offline dopo il primo caricamento riuscito.
- Nessun account, nessun analytics, nessun server applicativo, nessuna dipendenza esterna.

## Pubblicazione
Caricare il contenuto della cartella su un hosting statico HTTPS di fiducia. La pagina non funziona aprendo index.html con file://. Evitare host che iniettano script o modificano le risorse. Su iPhone aprire il link in Safari e scegliere Condividi > Aggiungi alla schermata Home. Su Android usare l'opzione Installa app del browser.

## Limiti di sicurezza — LEGGERE
Questo è un prototipo NON sottoposto a security audit: NON usarlo per password reali. L'archivio è salvato in localStorage (cifrato), che può essere eliminato dal browser o dal sistema. È disponibile un export/import manuale del blob cifrato, ma non un backup automatico, un sistema di recupero della password principale o la sincronizzazione. La password principale non viene salvata, ma il codice web servito dall'host potrebbe essere sostituito e sottrarre i dati alla successiva apertura: per un password manager di produzione occorre definire una strategia robusta di distribuzione e aggiornamento, hardening e test indipendenti. In memoria i dati sono in chiaro durante la sessione sbloccata. Nessuna difesa contro dispositivo compromesso, estensioni malevole o XSS introdotti da modifiche future. Il blocco automatico avviene dopo 2 minuti di inattività o quando la pagina viene nascosta. Il blocco non garantisce la cancellazione fisica dalla memoria JavaScript.

## Test locali
Con Python installato: `python -m http.server 8000` nella cartella, quindi aprire `http://localhost:8000` sul PC. Per testare su telefono usare hosting HTTPS, non l'IP LAN in HTTP.

## Novità v0.2
- Esportazione manuale del solo archivio cifrato in JSON.
- Importazione con verifica della password del backup e conferma esplicita prima di sostituire i dati.
- Nessuna credenziale in chiaro nei file di backup.
- ATTENZIONE: non ancora sottoposta a revisione di sicurezza.
