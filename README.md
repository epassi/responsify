#Responsify

Created for designers, this repository serves as a template for generating a single responsive page from a set of layout comps or wireframes. Helpful for simulating a responsive layout.

At the moment, you can generate only one page. Future versions aim to generate multiple pages.

###Required software
You'll need to install this software before using Responsify. This has been tested on Mac OS only. 

1. [Node.js](http://http://nodejs.org/) runtime
2. [Grunt](http://gruntjs.com/) command line interface (CLI) via terminal:  
`npm install -g grunt-cli`
3. [Homebrew](http://brew.sh/) package manager via terminal:  
`ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`
4. [GraphicsMagick](http://www.graphicsmagick.org/) image processor via terminal:  
`brew install graphicsmagick`

###Using Responsify
1. Create your new site by cloning this repository:  
`git clone http://github.com/epassi/responsify "My Prototype"`
2. Gather your layout comps or wireframes and name the files using their corresponing breakpoint. Example: 320.png, 600.png, 900.png, etc. **PNG format only.**
3. Run `npm install`.
4. Run `grunt`. Build preview will open in browser.
5. Drag your PNGs into the `/layouts` folder. Build preview will update in browser. Build update could take a few seconds, depending on how many files you drag at a time.
6. Resize the browser to see your layouts respond to the changing viewport.

###Sharing your prototype page
The `dist` folder (generated by Grunt) contains the minimum set of files for displaying your prototype. Host these files on a web server or zip up the folder and send via email.