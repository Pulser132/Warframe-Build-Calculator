# Goal

## General Overview and Purpose

- A website where users can create and share builds in warframe
- They should be able to identify their sources of damage
    - Each mod should show the user how much damage it is contributing to the build
- The builder should allow the user to select and modify their Warframe, Weapons, Companions, Operator, etc. Anything that the player can modify in game should be accounted for.
    - Include options for selecting incarnon evolutions on weapons with incarnons, etc.
- The builder for each piece of gear should somewhat resemble how the user modifies their gear in-game. For example, modifying a warframe should show an Aura mod slot + Exilus mod slot at the top, 8 mod slots at the bottom, and 2 arcane slots on the right.
- There should also be a configuration menu for setting the state of the player and their weapons. (How strong of a Roar buff the player has, how many stacks of each available stackable buff does the player have, incarnon form, etc.)
    - Make sure this is easily expandable
- Many weapons are similar, use inheritance and interfaces to make development more modular.

## Notes

- Divide the implementation into stages so we can make sure each stage is tested and correct before moving on
- When it comes to stats for weapons, make sure to note which stats are additive and which are multiplicative
- Refer to https://wiki.warframe.com/ when it comes to specifics on damage calculations. This is the most important part of this project.
- Some weapons/mods/etc may have special cases for their damage calculations, ensure this is easy to implement later on
    - They may also need special UI elements, make sure this can be implemented later on for weapons on a case-by-case basis.
- Gear/Mod stats should primarily be sourced using the @wfcd/items npm package

## High level architecture

- React framework
- Unit tests, especially for calculations
- Keep the math/calculation "engine" separate from the front end