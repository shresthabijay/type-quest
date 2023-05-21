import { For, createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import clsx from 'classnames'

const getLetterId = (wordIndex: number, letterIndex: number) => `letter-${wordIndex}-${letterIndex}`;

export const TypingComponent = () => {
  const challengeText = "Solid's overall approach to reactivity is to wrap any reactive computation in a function, and rerun that function when its dependencies update. The Solid JSX compiler also wraps most JSX expressions (code in braces) with a function, so they automatically update (and trigger corresponding DOM updates) when their dependencies change.";

  const textArray = challengeText.split(' ').map((word, i) => {
    return {
      index: i,
      text: word,
      letters: word.split('').map((letter, j) => {
        return {
          index: j,
          text: letter,
          error: false,
          populated: false,
          erroredTextAtTheEnd: false,
        }
      }),
      error: false,
      populated: false
    }
  })

  let cursorRef: HTMLDivElement | undefined = undefined;

  const [words, setWords] = createStore(textArray);
  const [currentCursor, setCurrentCursor] = createSignal([0, 0]);
  const [cursorStyles, setCursorStyles] = createSignal({
    transform: 'translate(0px, 0px)',
  });

  document.addEventListener('keydown', (event) => {
    const wordIndex = currentCursor()[0];
    const letterIndex = currentCursor()[1];

    const word = words[wordIndex];
    const letter = word?.letters?.[letterIndex];

    if(!word) return

    const isAtEndOfWord = letterIndex > word.letters.length - 1;
    const isAtStartOfWord = letterIndex === 0;

    // On hitting space
    if(event.key.length === 1 && event.key === ' ') {
      if(!isAtEndOfWord) return;
      if(wordIndex >= words.length - 1) return;
      setCurrentCursor([wordIndex + 1, 0])
    }
    // On printable characters
    else if(event.key.length === 1) {

      const typedCharacter = event.key;

      // If typed anything at the end of the word then we add those typed letters as errors at the end.
      if(isAtEndOfWord) {
        setWords(wordIndex, 'letters', (prevLetters) => [...prevLetters, {
          index: prevLetters.length,
          text: typedCharacter,
          error: true,
          populated: true,
          erroredTextAtTheEnd: true,
        }]);
        setCurrentCursor([wordIndex, letterIndex + 1]);
      }

      // Checking if the typed character is correct and updating the visual properties of the letter.
      else if(letter){
        const isCorrect = letter.text === typedCharacter;

        setWords(wordIndex, 'letters', letterIndex, (prevLetter) => ({
          ...prevLetter,
          populated: true,
          error: !isCorrect
        }));
        setCurrentCursor([wordIndex, letterIndex + 1]);
      }
    }
    // On backspace
    else if(event.key === 'Backspace') {
      // Deleting the entire word.
      // TODO: Need to detect platforma and use the correct key. (For windows ctrlKey is used)
      if(event.altKey) {
        setWords(wordIndex, 'letters', (prevLetters) => {
          return prevLetters.filter((letter) => !letter.erroredTextAtTheEnd).map(letter => {
            return {
              ...letter,
              error: false,
              populated: false,
              erroredTextAtTheEnd: false,
            }
          })
        })

        // Incase the cursor is at the very beginning of the word we move the cursor to the end of the previous word.
        if(isAtStartOfWord) {
          if(wordIndex === 0) return;
          const prevWordIndex = wordIndex - 1;
          const prevWordIndexLetters = words[prevWordIndex].letters;
          setCurrentCursor([prevWordIndex, prevWordIndexLetters.length])
        }
        else {
          setCurrentCursor([wordIndex, 0])
        }
          
      }
      // Deleting a single letter.
      else {
        // Incase the cursor is at the very beginning of the word we move the cursor to the end of the previous word.
        if(isAtStartOfWord) {
          if(wordIndex === 0) return;
          const prevWordIndex = wordIndex - 1;
          const prevWordIndexLetters = words[prevWordIndex].letters;
          setCurrentCursor([prevWordIndex, prevWordIndexLetters.length])
        }
        else {
          const prevLetterIndex = letterIndex - 1;
          const prevLetter = word.letters[prevLetterIndex];

          if(!prevLetter) return;

          const isErroredTextAtTheEnd = prevLetter.erroredTextAtTheEnd;

          // Incase of extra errored letter we remove the letter from the end of the word.
          if(isErroredTextAtTheEnd) {
            setWords(wordIndex, 'letters', (prevLetters) => {
              return [...prevLetters.slice(0, prevLetterIndex), ...prevLetters.slice(prevLetterIndex + 1)]
            })
          }
          // Incase of normal letter we just set visual properties of the letter to default.
          else {
            setWords(wordIndex, 'letters', prevLetterIndex, (prevLetter) => ({
              ...prevLetter,
              populated: false,
              error: false,
            }))
          }

          setCurrentCursor([wordIndex, prevLetterIndex]) 
        }
      }
    }
  })

  // Effect that updates the cursor div transform based on the current cursor position.
  createEffect(() => {
    if(!cursorRef) return;

    const cursor = currentCursor();
    const wordIndex = cursor[0];
    const word = words[wordIndex];
    const isCursorAtEndOfWord = cursor[1] > word.letters.length - 1;
    const letterIndex = isCursorAtEndOfWord ? word.letters.length - 1 : cursor[1];

    if(!word) return

    const letterId = getLetterId(wordIndex, letterIndex);
    const letterSpan = document.getElementById(letterId);

    if(!letterSpan) return

    const letterSpanRect = letterSpan.getBoundingClientRect();
    const cursorRect = cursorRef.getBoundingClientRect();
    const xOffset = letterSpanRect.x + (isCursorAtEndOfWord ? letterSpanRect.width : 0) - cursorRect.x;
    const yOffset = letterSpanRect.y - cursorRect.y;

    setCursorStyles({
      transform: `translate(calc(${xOffset}px - 2.5px), calc(${yOffset}px))`,
    })
  })

  return (
    <div class="mx-auto mt-20 w-[65vw]">
      <div class="w-full text-3xl relative">
        <For each={words}>{(word, i) => {
          return <div class="inline-block m-1">{
            <For each={word.letters}>{(letter, j) => {
              return <span id={getLetterId(i(), j())} class={clsx({
                'text-gray-400': !letter.populated && !letter.error && !letter.erroredTextAtTheEnd,
                'text-green-500': letter.populated && !letter.error && !letter.erroredTextAtTheEnd,
                'text-red-400': letter.error || letter.erroredTextAtTheEnd,
              })}>{letter.text}</span>
            }}
            </For>
          }</div>
        }}
        </For>
        <div class="absolute top-0" ref={cursorRef}>
          <div class="blink-cursor cursor w-[4px] h-[1.2em] bg-purple-800" style={cursorStyles()}></div>
        </div>
      </div>
    </div>
  )
}