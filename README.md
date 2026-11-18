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


## Aggiornamento v0.3
Aggiunti categorie, preferiti, filtri, controllo locale password duplicate e generatore configurabile. Il formato dell'archivio `vault.pwa.v1` e la cifratura AES-GCM/PBKDF2 rimangono invariati per compatibilità con v0.2. Blocco automatico dopo 120 secondi di inattività o quando la pagina diventa nascosta: già presente in v0.2.

**Prima dell'aggiornamento:** esportare un backup cifrato e verificarne la presenza. Sostituire i file alla radice del repository GitHub (non caricare la cartella esterna). Su iPhone chiudere e riaprire la PWA dopo il deploy; il service worker potrebbe richiedere un secondo avvio per attivare la nuova versione. Non cancellare i dati del sito e non disinstallare l'app.

**Limiti:** non è stata effettuata una revisione crittografica indipendente, non usare password reali. I dati possono andare persi se Safari elimina lo storage del sito. Il controllo duplicati avviene solo dopo lo sblocco, in memoria.


## Aggiornamento v0.4 — verifica backup non distruttiva
Nella schermata dell'archivio sbloccato premere **Verifica backup (senza importare)**, scegliere il file JSON esportato e digitare la password principale del backup. La verifica prova a decifrare e convalidare la struttura delle credenziali, mostrando solo il numero di elementi. Non scrive in localStorage e non sostituisce l'archivio corrente. Il tasto **Importa backup** continua invece a sostituire l'archivio dopo conferma esplicita: non usarlo per il test.

Prima dell'aggiornamento salvare un backup. Sostituire tutti i file nella radice del repository e attendere l'aggiornamento del service worker (potrebbero servire due riaperture). La verifica riuscita non costituisce un audit di sicurezza e non garantisce che il file rimanga disponibile in futuro. Usare solo credenziali fittizie.


## v0.5 — protezione della sessione e indicatore password
- Alla chiusura/blocco vengono svuotati riferimenti JavaScript a credenziali e chiave, campi di input, elenco e messaggi visibili. **Non** garantisce l'azzeramento fisico della memoria JS o delle copie interne del browser.
- Nel modulo credenziale, indicatore euristico della robustezza e pulsante Copia. Dopo 20 secondi tenta di svuotare gli appunti **solo se** sono ancora uguali alla password copiata; su iOS la lettura degli appunti può essere negata e la cancellazione non è garantita. Non usa un timer in background affidabile.
- Nessuna modifica al formato di cifratura o alla chiave localStorage `vault.pwa.v1`: aggiornamento compatibile con v0.4. Service worker con cache v5.
- Non è stato eseguito un audit indipendente; non usare password reali. Un host web compromesso o una modifica malevola del codice possono sottrarre i dati al prossimo sblocco.
- Test consigliati: blocca durante modifica e verifica che non restino dati nei campi; copia password fittizia e verifica avviso; verifica backup; ricarica e controlla credenziali fittizie.


## v0.6 — mitigazione delle operazioni asincrone
- Epoch di sessione: i salvataggi terminati dopo un blocco non possono più scrivere in localStorage.
- Snapshot immutabile per la cifratura; impediti salvataggi concorrenti.
- Sblocco, importazione, verifica e copia controllano se la sessione è cambiata durante le operazioni asincrone.
- Cache service worker aggiornata alla versione v6.
- Il formato cifrato v1 e la chiave localStorage `vault.pwa.v1` non cambiano.
- Limitazione: controlli statici effettuati; non è stato eseguito un test iOS o un audit indipendente. Non usare credenziali reali.

### Aggiornamento sicuro
Esportare e verificare prima un backup, poi caricare i file estratti alla radice di GitHub. Non cancellare l'app né i dati Safari. Dopo la pubblicazione chiudere e riaprire la PWA; può essere necessario un secondo avvio per aggiornare la cache. Verificare l'accesso e le credenziali fittizie.


## v0.7 — validazione e hardening (prototipo)
- Il formato cifrato v1 e la chiave localStorage restano invariati.
- Verifica preventiva delle dimensioni e della codifica dei campi crittografici prima di derivare la chiave; verifica della struttura di ogni credenziale dopo la decifratura.
- Impediti tentativi di sblocco concorrenti sulla stessa schermata.
- Aggiunta Content Security Policy via meta tag, con risorse solo dalla stessa origine e nessuno script inline. Su GitHub Pages questo non sostituisce header HTTP di sicurezza e non protegge da codice malevolo distribuito dalla stessa origine.
- Cache service worker v7.
- Verificare con credenziali fittizie: accesso, creazione, modifica, backup, blocco e riapertura. NON importare un backup nell'archivio principale solo per provarlo: usare Verifica backup.
- Limiti: nessun audit indipendente o test completo su iOS; non usare password reali. L'host resta un punto di fiducia critico.
