// no-conflict mode jQuery
jQuery(document).ready(() => {
  (($) => {

    // Add the Dictionary to the page
    const mediaQuery = window.matchMedia("(max-width: 910px)");
    let boxHeader = "Dictionary";
    if (mediaQuery.matches) {
      boxHeader = 'Dic';
    }
    const dictMain = "<div id='the-box' class='the-box'><div class='the-box-head' id='the-box-head'><p id='box-head-text'>" + boxHeader + "</p></div><div id='search-container'><input id='search-field' type='text' /><button id='search-button'>Поиск</button></div><div id='dict-content'></div></div>"
		const fontAwesome = '<script src="https://use.fontawesome.com/a7a79360ad.js"></script>';
    const boxElem = $(dictMain).appendTo('body')[0];
		$(fontAwesome).appendTo('body')[0];

    //store initial height
    const defaultHeight = window.getComputedStyle(boxElem, null).height;

    // set the height of the dictionary box
    setHeight = (height) => {

      if ($(boxElem).hasClass('opened')) {
        $('#box-head-text').html('Dictionary')
        // opened height is argument or calculated based on content to print
        let contentSize = height || $('#dict-content')[0].scrollHeight + $('#search-container')[0].scrollHeight + $('#the-box-head')[0].scrollHeight;

        $(boxElem).css('height', contentSize);

      } else {
        //closed height is initial height
        $(boxElem).css('height', defaultHeight);
        $('#box-head-text').html(boxHeader);
      }
    }

    // Empty input and dictionary contents and put cursor in search
    clearFields = () => {
      $('#search-field').val("").focus();
      $('#dict-content').html("");
    }

    // handle click to open or close
    $('.the-box-head').click(() => {
      $(boxElem).toggleClass('opened');

      // if opening, empty content
      if ($(boxElem).hasClass('opened')) {
        clearFields();
      }
      setHeight();
    })

    // if window is resized - reset box height
    $(window).resize(() => {
      setHeight();
			if (mediaQuery.matches) {
				boxHeader = 'Dic';
			} else {
				boxHeader = 'Dictionary';
		}
		$('#box-head-text').html(boxHeader);
    })

    // handle enter-key click in search field
    $('#search-field').keypress((e) => {
      if (e.keyCode == 13) {
        const searchBoxValue = e.target.value;
        if (searchBoxValue !== '') {
          doSearch(searchBoxValue);
        }
      }
    });

    // prevent double-click in text input from recalling the same search
    $('#search-field').dblclick((e) => {
      e.stopPropagation();
    })


    // handle search button click
    $('#search-button').click(() => {
      const searchBoxValue = $('#search-field').val();
      if (searchBoxValue !== '') {
        doSearch(searchBoxValue);
      }
    });

    //On double-click in page or dictionary get selection and search
    document.ondblclick = () => {
      let selected = (document.selection && document.selection.createRange().text) || (window.getSelection && window.getSelection().toString());

      if (!selected)
        return;
      selected = filterWord(selected);

      if (selected !== '') {
        $('#search-field').val(selected);
        $(boxElem).addClass('opened');

        $('#box-head-text').html('Dictionary')

        // if non-ASCII symbols return not a word
        if (notASCII(selected)) {
          return notWord(selected);
        }
        doSearch(selected);
      }
    }

    // return false if foreign charachters found
    notASCII = (selected) => {
      const notASCII = /[^\u0000-\u007f]/;
      return notASCII.test(selected);
    }

    filterWord = (selected) => {

      // remove curly apostrophes
      selected = selected.replace(/[\u2018\u2019]/g, "'");

      // remove any text after apostrophe
      if (selected.indexOf("'") > 0) {
        selected = selected.slice(0, selected.indexOf("'"));
      }
      // remove whitespace
      return selected.replace(/^\s+|\s+$/g, "")
    }

    // mobile only - handle long-press (tap-hold)
    if (/Mobi/i.test(navigator.userAgent) || /Android/i.test(navigator.userAgent)) {

      // Arrow function and function expression do not work here - Uncaught RangeError: Maximum call stack size exceeded
      function getSelection() {
        let selected = window.getSelection() || document.getSelection() || document.selection.createRange().text || '';

        selected = selected.toString();
        if (selected === '')
          return false;
        $('#search-field').val(selected);
        $(boxElem).addClass('opened');
        if (notASCII(selected)) {
          return false;
        }
        return filterWord(selected);
      }

      $(document).on("taphold", (e) => {
				e.preventDefault();
        e.stopPropagation();
        const selected = getSelection();
        if (!selected)
          notWord(selected);
        else
          doSearch(selected);
        }
      );
    }

    // make call to rest API (proxy for multiple API calls - check db, or get wordnik data and yandex translation)
    doSearch = (searchTerm) => {
      if (!searchTerm) {
        return notWord(searchTerm);
      }
      $.get('https://upexam.ru/dictionary-process/?searchTerm=' + searchTerm, (response) => {
        console.log(response)
        if (!response || !response.word) {
          return notWord(searchTerm);
        }
        const word = response.word,
          definition = response.definition,
          partOfSpeech = response.partOfSpeech,
          translation = response.translation,
          pronunciation = response.audio;

        printResults(word, partOfSpeech, definition, translation, pronunciation);
        setHeight();
      })
    }

    // display results of work lookup
    printResults = (headWord, partOfSpeech, definition, translation, pronunciation) => {

      // if logged-in and translation is available, show add to persomnal dictionary button
      let addButton = '';
      if (typeof userObject !== "undefined" && translation != null) {
        addButton = '<button id="add-to-dict">добавить</button>';
      }

      // if pronunciation available add button after the audio file has successfully loaded
      if (pronunciation) {
        let playButton = '<button id="play-pronunciation"><i class="fa fa-headphones" aria-hidden="true"></i></button>';

        let audio = new Audio(pronunciation);
        audio.oncanplaythrough = () => {

					if ($('#play-pronunciation').length === 0) {
          $(playButton).appendTo('#part-of-speech');
          setHeight();
          $('#play-pronunciation').click(() => {
            audio.play();
            })
				  }
        }
      }

      translation = translation || '';

      // reset input value in case word returned from api is different, e.g. capitalization
      $('#search-field').val(headWord);

      // display data
      $('#dict-content').html('<div><small id="part-of-speech">' + partOfSpeech + '</small><br><p>' + definition + '</p><small class="translated-dict">' + translation + '</small><div class="dict-add-button-container">' + addButton + '</div></div>');

      // handle add to personal dictionary click
      if (addButton) {
        $('#add-to-dict').click(() => {
          handleAdd(headWord, partOfSpeech, definition, translation);
        })
      }
    }

    //add word to user's database
    handleAdd = (headword, partOfSpeech, definition, translation) => {

      const userId = userObject['data']['ID'];
      const userLogin = userObject['data']['user_login'];
      const data = {
        userId: userId,
        userLogin: userLogin,
        headWord: headword,
        partOfSpeech: partOfSpeech,
        definition: definition,
        translation: translation // encodeURIComponent(translation)
      }

      $.get('https://upexam.ru/add-new-word-to-personal-dict', data, () => {

        // successfully added message
        const addedText = '<div>"' + headword + '" has been added!<br><a href="https://upexam.ru/my-dictionary" target="_blank">My Dictionary</a></div>';
        $('#dict-content').html(addedText);
        setHeight();

        // if word added on the user-dictionary page, refresh page
        if (location.pathname === "/my-dictionary/") {
          setTimeout(() => {
            location.reload();
          }, 500)
        }
      })
    }

    // inform user if lookup fails
    notWord = (searchTerm = 'selected...') => {

      const box = $('#dict-content').html('<div><p>It seems ' + searchTerm + ' may not be an English word...</p></div>');
      setHeight(135);
    }

  })(jQuery);
});
