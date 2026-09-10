(function() {
    var worker = null;
    var target = document.getElementById('address-match-target');
    var candidates = document.getElementById('address-match-candidates');
    var checkButton = document.getElementById('address-worker-button');
    var cancelButton = document.getElementById('address-worker-cancel');
    var lengthSelect = document.getElementById('address-word-count');
    var progress = document.getElementById('address-worker-progress');
    var status = document.getElementById('address-worker-status');
    var resultsContainer = document.getElementById('address-match-results');
    var resultList = null;

    function escapeHtml(value) {
        return $('<div>').text(value).html();
    }

    function setRunning(running) {
        checkButton.disabled = running;
        cancelButton.disabled = !running;
    }

    function addResult(result) {
        var className = result.match ? 'list-group-item-success' : '';
        var detail = result.match ? 'Matches: ' + result.found.join(', ') : result.reason;
        resultList.insertAdjacentHTML('beforeend', '<li class="list-group-item ' + className + '"><strong>' + escapeHtml(result.phrase) + '</strong><br>' + escapeHtml(detail) + '</li>');
    }

    checkButton.addEventListener('click', function() {
        var phraseCandidates = candidates.value.split(/\r?\n/).filter(function(value) { return value.trim().length > 0; });
        var address = target.value.trim();
        if (!address || phraseCandidates.length === 0) {
            status.textContent = 'Enter a target address and at least one complete candidate phrase.';
            return;
        }

        resultsContainer.innerHTML = '<div class="alert alert-info">Results will appear as candidates are checked.</div><ul class="list-group"></ul>';
        resultList = resultsContainer.querySelector('ul');
        progress.value = 0;
        progress.max = phraseCandidates.length;
        status.textContent = 'Starting worker...';
        setRunning(true);
        worker = new Worker('js/address-checker-worker.js');
        worker.onmessage = function(event) {
            var message = event.data;
            if (message.type === 'result') {
                addResult(message.result);
            }
            else if (message.type === 'progress') {
                progress.value = message.checked;
                status.textContent = 'Checked ' + message.checked + ' of ' + message.total + ' candidates.';
            }
            else if (message.type === 'cancelled') {
                progress.value = message.checked;
                status.textContent = 'Search cancelled after ' + message.checked + ' candidate(s).';
                setRunning(false);
                worker.terminate();
                worker = null;
            }
            else if (message.type === 'done') {
                progress.value = message.total;
                status.textContent = 'Finished checking ' + message.total + ' candidate(s).';
                setRunning(false);
                worker.terminate();
                worker = null;
            }
        };
        worker.onerror = function() {
            status.textContent = 'The worker stopped because of an error.';
            setRunning(false);
            worker.terminate();
            worker = null;
        };
        worker.postMessage({
            type: 'start',
            target: address,
            candidates: phraseCandidates,
            wordCount: lengthSelect.value,
            paths: {
                btcLegacy: true,
                btcSegwit: true,
                btcBech32: true,
                eth: true
            }
        });
    });

    cancelButton.addEventListener('click', function() {
        if (worker) {
            status.textContent = 'Stopping...';
            worker.postMessage({ type: 'cancel' });
        }
    });
})();
