import { describe, expect, it } from "vitest";
import { pk, schema, get, nestOne, nestMany } from "../index";

describe("simple transformations", () => {
  it("should build schema with one attribute", () => {
    const s = schema(pk("parent_id"), { id: get("parent_id") });
    const transformed = s.transform([{ parent_id: 1 }]);
    expect(transformed).toEqual([{ id: 1 }]);
  });

  it("should build schema with multiple attributes", () => {
    const s = schema(pk("parent_id"), {
      id: get("parent_id"),
      val: get("parent_val"),
    });
    const transformed = s.transform([{ parent_id: 1, parent_val: "p1" }]);
    expect(transformed).toEqual([{ id: 1, val: "p1" }]);
  });

  it("should deduplicate and preserve order of items", () => {
    const s = schema(pk("parent_id"), {
      id: get("parent_id"),
      val: get("parent_val"),
    });
    const transformed = s.transform([
      { parent_id: 1, parent_val: "p1" },
      { parent_id: 2, parent_val: "p2" },
      { parent_id: 1, parent_val: "p1" },
    ]);
    expect(transformed).toEqual([
      { id: 1, val: "p1" },
      { id: 2, val: "p2" },
    ]);
  });
});

describe("transform()", () => {
  it("should collapse simple tree structures", () => {
    const data = [
      { parent_id: 1, parent_val: "p1", children_id: 11, children_val: "c1" },
      { parent_id: 1, parent_val: "p1", children_id: 12, children_val: "c2" },
    ];
    const s = schema(pk("parent_id"), {
      id: get("parent_id"),
      val: get("parent_val"),
      children: nestMany(
        schema(pk("children_id"), {
          id: get("children_id"),
          val: get("children_val"),
        })
      ),
    });
    const transformed = s.transform(data);

    expect(transformed).toEqual([
      {
        id: 1,
        val: "p1",
        children: [
          { id: 11, val: "c1" },
          { id: 12, val: "c2" },
        ],
      },
    ]);
  });
  it("should handle objects", () => {
    const data = [
      {
        parent_id: 1,
        parent_val: "p1",
        children_id: 11,
        children_val: "c1",
      },
    ];
    const s = schema(pk("parent_id"), {
      id: get("parent_id"),
      val: get("parent_val"),
      children: nestMany(
        schema(pk("children_id"), {
          id: get("children_id"),
          val: get("children_val"),
        })
      ),
    });

    const transformed = s.transform(data);

    expect(transformed).toEqual([
      { id: 1, val: "p1", children: [{ id: 11, val: "c1" }] },
    ]);
  });

  it("should collapse children into other children", () => {
    const data = [
      {
        parent_id: 1,
        parent_val: "p1",
        children1_id: 11,
        children1_val: "c1",
        children1_children2_id: 21,
        children1_children2_val: "d1",
      },
      {
        parent_id: 1,
        parent_val: "p1",
        children1_id: 12,
        children1_val: "c2",
        children1_children2_id: 22,
        children1_children2_val: "d2",
      },
      {
        parent_id: 1,
        parent_val: "p1",
        children1_id: 12,
        children1_val: "c2",
        children1_children2_id: 23,
        children1_children2_val: "d3",
      },
    ];

    const s = schema(pk("parent_id"), {
      id: get("parent_id"),
      val: get("parent_val"),
      children1: nestMany(
        schema(pk("children1_id"), {
          id: get("children1_id"),
          val: get("children1_val"),
          children2: nestMany(
            schema(pk("children1_children2_id"), {
              id: get("children1_children2_id"),
              val: get("children1_children2_val"),
            })
          ),
        })
      ),
    });

    const transformed = s.transform(data);

    expect(transformed).toEqual([
      {
        id: 1,
        val: "p1",
        children1: [
          {
            id: 11,
            val: "c1",
            children2: [
              {
                id: 21,
                val: "d1",
              },
            ],
          },
          {
            id: 12,
            val: "c2",
            children2: [
              {
                id: 22,
                val: "d2",
              },
              {
                id: 23,
                val: "d3",
              },
            ],
          },
        ],
      },
    ]);
  });

  it("should collapse object descendants", () => {
    const data = [
      {
        parent_id: 1,
        parent_val: "p1",
        child_id: 11,
        child_val: "c1",
        grandchild_id: 111,
        grandchild_val: "g1",
      },
    ];

    const s = schema(pk("parent_id"), {
      id: get("parent_id"),
      val: get("parent_val"),
      child: nestOne(
        schema(pk("child_id"), {
          id: get("child_id"),
          val: get("child_val"),
          grandchild: nestOne(
            schema(pk("grandchild_id"), {
              id: get("grandchild_id"),
              val: get("grandchild_val"),
            })
          ),
        })
      ),
    });

    const transformed = s.transform(data);

    expect(transformed).toEqual([
      {
        id: 1,
        val: "p1",
        child: {
          id: 11,
          val: "c1",
          grandchild: {
            id: 111,
            val: "g1",
          },
        },
      },
    ]);
  });

  it("consolidates duplicate children by pk", () => {
    const data = [
      {
        parent_id: 1,
        parent_val: "p1",
        children_child_id: 11,
        children_val: "c1",
      },
      {
        parent_id: 1,
        parent_val: "p1",
        children_child_id: 12,
        children_val: "c2",
      },
      {
        parent_id: 1,
        parent_val: "p1",
        children_child_id: 12,
        children_val: "c2",
      },
    ];

    const s = schema(pk("parent_id"), {
      id: get("parent_id"),
      val: get("parent_val"),
      children: nestMany(
        schema(pk("children_child_id"), {
          child_id: get("children_child_id"),
          val: get("children_val"),
        })
      ),
    });

    const transformed = s.transform(data);

    expect(transformed).toEqual([
      {
        id: 1,
        val: "p1",
        children: [
          {
            child_id: 11,
            val: "c1",
          },
          {
            child_id: 12,
            val: "c2",
          },
        ],
      },
    ]);
  });

  it("should accept multiple keys in pk", () => {
    const data = [
      {
        children1_children2_id_one: 21,
        children1_id_two: 12,
        children1_id_one: 11,
        parent_id_one: 1,
        children1_children2_id_two: 22,
        parent_val: "p1",
        children1_val: "c1",
        parent_id_two: 2,
        children1_children2_val: "d1",
      },
      {
        children1_children2_id_one: 23,
        children1_id_two: 14,
        children1_id_one: 13,
        parent_id_one: 1,
        children1_children2_id_two: 24,
        parent_val: "p1",
        children1_val: "c2",
        parent_id_two: 2,
        children1_children2_val: "d2",
      },
      {
        children1_children2_id_one: 25,
        children1_id_two: 14,
        children1_id_one: 13,
        parent_id_one: 1,
        children1_children2_id_two: 26,
        parent_val: "p1",
        children1_val: "c2",
        parent_id_two: 2,
        children1_children2_val: "d3",
      },
      {
        children1_children2_id_one: 27,
        children1_id_two: 16,
        children1_id_one: 15,
        parent_id_one: 3,
        children1_children2_id_two: 28,
        parent_val: "p2",
        children1_val: "c3",
        parent_id_two: 4,
        children1_children2_val: "d4",
      },
    ];

    const s = schema(pk("parent_id_one", "parent_id_two"), {
      id_one: get("parent_id_one"),
      id_two: get("parent_id_two"),
      val: get("parent_val"),
      children1: nestMany(
        schema(pk("children1_id_one", "children1_id_two"), {
          id_one: get("children1_id_one"),
          id_two: get("children1_id_two"),
          val: get("children1_val"),
          children2: nestMany(
            schema(
              pk("children1_children2_id_one", "children1_children2_id_two"),
              {
                id_one: get("children1_children2_id_one"),
                id_two: get("children1_children2_id_two"),
                val: get("children1_children2_val"),
              }
            )
          ),
        })
      ),
    });

    const transformed = s.transform(data);

    expect(transformed).toEqual([
      {
        id_one: 1,
        id_two: 2,
        val: "p1",
        children1: [
          {
            id_one: 11,
            id_two: 12,
            val: "c1",
            children2: [
              {
                id_one: 21,
                id_two: 22,
                val: "d1",
              },
            ],
          },
          {
            id_one: 13,
            id_two: 14,
            val: "c2",
            children2: [
              {
                id_one: 23,
                id_two: 24,
                val: "d2",
              },
              {
                id_one: 25,
                id_two: 26,
                val: "d3",
              },
            ],
          },
        ],
      },
      {
        id_one: 3,
        id_two: 4,
        val: "p2",
        children1: [
          {
            id_one: 15,
            id_two: 16,
            val: "c3",
            children2: [
              {
                id_one: 27,
                id_two: 28,
                val: "d4",
              },
            ],
          },
        ],
      },
    ]);
  });

  it("should apply new parents only in the correct scope", () => {
    const data = [
      {
        address_state: "Sao Paulo",
        this_archived: false,
        contact_email: "email",
        address_zipCode: "zip",
        address_number: "number",
        account_id: 1,
        labels_id: "297726d0-301d-4de6-b9a4-e439b81f44ba",
        this_notes: null,
        address_neighborhood: null,
        this_id: 1,
        labels_type: 1,
        contact_phone: "phone",
        labels_name: "Contrato",
        address_coords_latitude: "1",
        address_complement: null,
        labels_color: "yellow",
        address_street: "street",
        address_coords_longitude: "2",
        address_city: "Sao Paulo",
        this_name: "Eduardo Luiz",
      },
      {
        address_state: "Sao Paulo",
        this_archived: false,
        contact_email: "email",
        address_zipCode: "zip",
        address_number: "number",
        account_id: 1,
        labels_id: "1db6e07f-91e2-42fb-b65c-9a364b6bad4c",
        this_notes: null,
        address_neighborhood: null,
        this_id: 1,
        labels_type: 1,
        contact_phone: "phone",
        labels_name: "Particular",
        address_coords_latitude: "1",
        address_complement: null,
        labels_color: "purple",
        address_street: "street",
        address_coords_longitude: "2",
        address_city: "Sao Paulo",
        this_name: "Eduardo Luiz",
      },
    ];

    const s = schema(pk("this_id"), {
      id: get("this_id"),
      name: get("this_name"),
      notes: get("this_notes"),
      archived: get("this_archived"),
      account: nestOne(
        schema(pk("account_id"), {
          id: get("account_id"),
        })
      ),
      contact: nestOne(
        schema(pk("this_id"), {
          email: get("contact_email"),
          phone: get("contact_phone"),
        })
      ),
      address: nestOne(
        schema(pk("this_id"), {
          number: get("address_number"),
          street: get("address_street"),
          complement: get("address_complement"),
          neighborhood: get("address_neighborhood"),
          city: get("address_city"),
          state: get("address_state"),
          zipCode: get("address_zipCode"),
          coords: nestOne(
            schema(pk("this_id"), {
              latitude: get("address_coords_latitude"),
              longitude: get("address_coords_longitude"),
            })
          ),
        })
      ),
      labels: nestMany(
        schema(pk("labels_id"), {
          id: get("labels_id"),
          name: get("labels_name"),
          color: get("labels_color"),
          type: get("labels_type"),
        })
      ),
    });

    const transformed = s.transform(data);

    expect(transformed).toEqual([
      {
        id: 1,
        account: {
          id: 1,
        },
        name: "Eduardo Luiz",
        contact: {
          email: "email",
          phone: "phone",
        },
        notes: null,
        archived: false,
        address: {
          zipCode: "zip",
          street: "street",
          number: "number",
          complement: null,
          neighborhood: null,
          city: "Sao Paulo",
          state: "Sao Paulo",
          coords: {
            latitude: "1",
            longitude: "2",
          },
        },
        labels: [
          {
            id: "297726d0-301d-4de6-b9a4-e439b81f44ba",
            name: "Contrato",
            color: "yellow",
            type: 1,
          },
          {
            id: "1db6e07f-91e2-42fb-b65c-9a364b6bad4c",
            name: "Particular",
            color: "purple",
            type: 1,
          },
        ],
      },
    ]);
  });
});
