DROP TABLE IF EXISTS reviews CASCADE;
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,       /* Name of the visiting team                     */
  food_name VARCHAR(50) NOT NULL,   /* Final score of the game for the Buffs         */
  review VARCHAR(500),/* Final score of the game for the visiting team */
  review_date DATE NOT NULL        /* Date of the game                              */
);