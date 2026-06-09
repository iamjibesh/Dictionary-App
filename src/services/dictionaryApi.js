import axios from 'axios';

const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const fetchWord = async (word) => {
  try {
    const response = await axios.get(`${BASE_URL}/${word}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching word:", error);
    throw error;
  }
};
