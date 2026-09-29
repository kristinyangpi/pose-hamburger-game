# Pose Hamburger Game

A simple webcam interaction using only the Teachable Machine pose model:

https://teachablemachine.withgoogle.com/models/CmWSWobAH/

## Interaction

1. User is prompted to raise left hand to mouth.
2. When the Eating / left-hand-to-mouth pose is detected:
   - a 🍔 appears at the user's mouth area,
   - the burger animates smaller in steps to simulate being bitten/eaten.
3. When the burger is gone:
   - the app prompts the user to give a right-hand thumbs up.
4. When the finish pose is detected:
   - text shows `Yum! +1`
   - score increases by 1.
5. The round resets.

## Run in VS Code

1. Open this folder in VS Code.
2. Install the Live Server extension by Ritwick Dey.
3. Open `index.html`.
4. Right-click and choose `Open with Live Server`.
5. Allow camera access.
6. Click `Start Camera`.

## Notes

- Camera display is not mirrored.
- The burger uses the detected nose landmark plus a small downward offset to approximate the mouth position.
- Live pose label and confidence are shown on the right.
- Class mapping supports names containing `eat`, `left hand`, `thumb`, `finish`, or `right hand`.
