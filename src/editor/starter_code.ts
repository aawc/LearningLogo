export const DEFAULT_STARTER_CODE = `; Welcome to LearningLogo! (https://varun.khaneja.org/LearningLogo/)
; Press [RUN] to draw a square.

TO SQUARE :SIZE
  REPEAT 4 [
    FD :SIZE
    RT 90
  ]
END

CS
SETPC "BLUE
SETPW 3
SQUARE 120
`;
