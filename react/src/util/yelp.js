const SEARCH_PATH = "/api/yelp/businesses/search";

export async function searchBusinesses(term, location, sortBy) {
    const params = new URLSearchParams({
        term, 
        location,
        sort_by: sortBy,
        limit: "20",
    });

    const res = await fetch(`${SEARCH_PATH}?${params}`);

    if (!res.ok) {
        throw new Error(`Yelp request failed (${res.status})`);
    }

    const json = await res.json();

    const businesses = json.businesses;

    return businesses.map((business) => {
        return {
            id: business.id,
            imageSrc: business.image_url,
            name: business.name,
            address: business.location.address1,
            city: business.location.city,
            state: business.location.state,
            zipCode: business.location.zip_code,
            category: business.categories[0].title,
            rating: business.rating,
            reviewCount: business.review_count,
        };
    });
}

export default searchBusinesses;
