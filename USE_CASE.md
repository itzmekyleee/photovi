# PHOTOVI Use Case Document

## Actor

The system has one actor, the User, who is the person operating the PHOTOVI photo booth through their browser.

## Use Cases (all connected to User)

The User can enable the camera, so the app shows a live preview of themselves.

The User can preview and apply a filter, selecting a visual filter and seeing it applied live to the live preview before taking any photo.

The User can change the photo resolution, choosing how detailed or large the captured photos are.

The User can switch between the front and back camera.

The User can mirror the live preview horizontally.

The User can change the strip theme, selecting a color and style preset for the photo strip.

The User can change the title and subtitle, customizing the text displayed on the photo strip.

The User can edit the accent and background colors, customizing the strip's color scheme.

The User can choose the number of photos, selecting how many shots will be taken in a session.

The User can start the capture session, triggering the system to take the chosen number of photos in sequence.

The User can view the finished photo strip after the capture session ends.

The User can download the photo strip, saving it as a file to their device.

## Include relationships — always happen automatically, never optional

Start the capture session includes composing the layout, meaning as soon as all photos in the session are captured, the system automatically assembles them into the final strip layout without the User triggering this separately.

Start the capture session includes triggering the countdown, meaning every time the User starts the capture session, the system automatically runs a countdown before each shot.

## Extend relationships — optional, only sometimes happen

Triggering the flash extends start the capture session, meaning a flash effect optionally fires during the capture sequence.

Triggering a retake extends viewing the photo strip, meaning while looking at the finished strip, the User can optionally restart the capture session for a new strip.

Deleting the photo strip extends viewing the photo strip, meaning while looking at the finished strip, the User can optionally remove it.

Sharing the photo strip extends viewing the photo strip, meaning while looking at the finished strip, the User can optionally share it through the device's share options.

Adding a sticker extends viewing the photo strip, meaning while looking at the finished strip, the User can optionally decorate it with a sticker.
